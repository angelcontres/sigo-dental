package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func setupTestServer(t *testing.T) (*Server, func()) {
	t.Helper()
	tmpDir, err := os.MkdirTemp("", "sigo-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	dbPath := filepath.Join(tmpDir, "test.db")
	db, err := openDB(dbPath)
	if err != nil {
		os.RemoveAll(tmpDir)
		t.Fatalf("failed to open test db: %v", err)
	}

	if err := seed(db); err != nil {
		db.Close()
		os.RemoveAll(tmpDir)
		t.Fatalf("failed to seed test db: %v", err)
	}

	s := &Server{
		db:        db,
		secret:    []byte("test-secret"),
		staticDir: tmpDir,
	}

	cleanup := func() {
		db.Close()
		os.RemoveAll(tmpDir)
	}

	return s, cleanup
}

func TestHealthEndpoint(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]string{"status": "ok"})
	})

	req := httptest.NewRequest("GET", "/api/health", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}

	var res map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if res["status"] != "ok" {
		t.Errorf("expected status 'ok', got '%s'", res["status"])
	}
}

func TestAuthLogin(t *testing.T) {
	s, cleanup := setupTestServer(t)
	defer cleanup()

	// 1. Successful login
	loginBody, _ := json.Marshal(map[string]string{
		"email":    "admin@sigo.local",
		"password": "admin123",
	})
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	rec := httptest.NewRecorder()
	s.handleLogin(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on login, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	var loginRes struct {
		Token string `json:"token"`
		User  User   `json:"user"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&loginRes); err != nil {
		t.Fatalf("failed to decode login response: %v", err)
	}
	if loginRes.Token == "" {
		t.Errorf("expected non-empty token")
	}
	if loginRes.User.Role != "admin" {
		t.Errorf("expected role 'admin', got '%s'", loginRes.User.Role)
	}

	// 2. Failed login
	badBody, _ := json.Marshal(map[string]string{
		"email":    "admin@sigodental.com",
		"password": "wrongpassword",
	})
	reqBad := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(badBody))
	recBad := httptest.NewRecorder()
	s.handleLogin(recBad, reqBad)

	if recBad.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 on bad password, got %d", recBad.Code)
	}
}

func TestTreatmentBudgetsAndItems(t *testing.T) {
	s, cleanup := setupTestServer(t)
	defer cleanup()

	// Find an existing patient from seed data
	var patientID string
	err := s.db.QueryRow(`SELECT id FROM patients LIMIT 1`).Scan(&patientID)
	if err != nil {
		t.Fatalf("no patients in seed data: %v", err)
	}

	// Create treatment budget
	token, _ := s.issueToken(&User{ID: "u1", Name: "Admin", Role: "admin"})
	body, _ := json.Marshal(map[string]any{
		"total":  25000,
		"status": "PENDIENTE",
	})
	req := httptest.NewRequest("POST", "/api/patients/"+patientID+"/treatment-budgets", bytes.NewReader(body))
	req.SetPathValue("id", patientID)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	s.auth(s.handleCreateTreatmentBudget)(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 created, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	var budget TreatmentBudget
	if err := json.NewDecoder(rec.Body).Decode(&budget); err != nil {
		t.Fatalf("failed to decode budget: %v", err)
	}

	// Add item to budget
	itemBody, _ := json.Marshal(map[string]any{
		"description": "Limpieza y destartraje",
		"amount":      12000,
		"phase":       "Fase 1 - Higiene",
	})
	reqItem := httptest.NewRequest("POST", "/api/treatment-budgets/"+budget.ID+"/items", bytes.NewReader(itemBody))
	reqItem.SetPathValue("budgetId", budget.ID)
	reqItem.Header.Set("Authorization", "Bearer "+token)
	recItem := httptest.NewRecorder()
	s.auth(s.handleCreateTreatmentItem)(recItem, reqItem)

	if recItem.Code != http.StatusCreated {
		t.Fatalf("expected 201 for item, got %d (body: %s)", recItem.Code, recItem.Body.String())
	}

	var item TreatmentItem
	if err := json.NewDecoder(recItem.Body).Decode(&item); err != nil {
		t.Fatalf("failed to decode item: %v", err)
	}

	// Read items
	reqGetItems := httptest.NewRequest("GET", "/api/treatment-budgets/"+budget.ID+"/items", nil)
	reqGetItems.SetPathValue("budgetId", budget.ID)
	reqGetItems.Header.Set("Authorization", "Bearer "+token)
	recGetItems := httptest.NewRecorder()
	s.auth(s.handleTreatmentItems)(recGetItems, reqGetItems)

	if recGetItems.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recGetItems.Code)
	}

	var items []TreatmentItem
	if err := json.NewDecoder(recGetItems.Body).Decode(&items); err != nil {
		t.Fatalf("failed to decode items list: %v", err)
	}
	if len(items) != 1 {
		t.Errorf("expected 1 item, got %d", len(items))
	}

	// Approve item
	reqApprove := httptest.NewRequest("POST", "/api/treatment-items/"+item.ID+"/approve", nil)
	reqApprove.SetPathValue("itemId", item.ID)
	reqApprove.Header.Set("Authorization", "Bearer "+token)
	recApprove := httptest.NewRecorder()
	s.auth(s.handleApproveTreatmentItem)(recApprove, reqApprove)

	if recApprove.Code != http.StatusOK {
		t.Fatalf("expected 200 on approve, got %d (body: %s)", recApprove.Code, recApprove.Body.String())
	}
}
