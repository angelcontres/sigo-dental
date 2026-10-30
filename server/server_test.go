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

func TestPrescriptionsAndAllergyCheck(t *testing.T) {
	s, cleanup := setupTestServer(t)
	defer cleanup()

	token, _ := s.issueToken(&User{ID: "u1", Name: "Admin", Role: "admin"})

	// Create a patient with known allergy
	patientBody, _ := json.Marshal(map[string]any{
		"name":      "Paciente Con Alergia",
		"doc":       "DOC-ALERGIA-1",
		"sedeId":    "s1",
		"allergies": "Alergia severa a Penicilina",
	})
	reqPat := httptest.NewRequest("POST", "/api/patients", bytes.NewReader(patientBody))
	reqPat.Header.Set("Authorization", "Bearer "+token)
	recPat := httptest.NewRecorder()
	s.auth(s.handleCreatePatient)(recPat, reqPat)

	if recPat.Code != http.StatusCreated {
		t.Fatalf("failed to create patient: %d (%s)", recPat.Code, recPat.Body.String())
	}

	var patient Patient
	_ = json.NewDecoder(recPat.Body).Decode(&patient)

	// Attempt to prescribe Amoxicilina (should trigger 409 ALERTA_ALERGIA)
	rxBody, _ := json.Marshal(map[string]any{
		"medication": "Amoxicilina 500mg",
		"dose":       "500mg",
		"route":      "Oral",
		"frequency":  "Cada 8 horas",
		"duration":   "7 días",
	})
	reqRx := httptest.NewRequest("POST", "/api/patients/"+patient.ID+"/prescriptions", bytes.NewReader(rxBody))
	reqRx.SetPathValue("id", patient.ID)
	reqRx.Header.Set("Authorization", "Bearer "+token)
	recRx := httptest.NewRecorder()
	s.auth(s.handleCreatePrescription)(recRx, reqRx)

	if recRx.Code != http.StatusConflict {
		t.Errorf("expected 409 conflict for allergy warning, got %d", recRx.Code)
	}

	// Now prescribe with IgnoreWarning: true (confirmed by professional)
	rxConfirmedBody, _ := json.Marshal(map[string]any{
		"medication":    "Amoxicilina 500mg",
		"dose":          "500mg",
		"route":         "Oral",
		"frequency":     "Cada 8 horas",
		"duration":      "7 días",
		"ignoreWarning": true,
	})
	reqRxOk := httptest.NewRequest("POST", "/api/patients/"+patient.ID+"/prescriptions", bytes.NewReader(rxConfirmedBody))
	reqRxOk.SetPathValue("id", patient.ID)
	reqRxOk.Header.Set("Authorization", "Bearer "+token)
	recRxOk := httptest.NewRecorder()
	s.auth(s.handleCreatePrescription)(recRxOk, reqRxOk)

	if recRxOk.Code != http.StatusCreated {
		t.Fatalf("expected 201 on confirmed prescription, got %d (%s)", recRxOk.Code, recRxOk.Body.String())
	}

	var rx Prescription
	_ = json.NewDecoder(recRxOk.Body).Decode(&rx)

	// Cancel prescription
	cancelBody, _ := json.Marshal(map[string]string{
		"reason": "Sustitución por Azitromicina",
	})
	reqCancel := httptest.NewRequest("POST", "/api/prescriptions/"+rx.ID+"/cancel", bytes.NewReader(cancelBody))
	reqCancel.SetPathValue("id", rx.ID)
	reqCancel.Header.Set("Authorization", "Bearer "+token)
	recCancel := httptest.NewRecorder()
	s.auth(s.handleCancelPrescription)(recCancel, reqCancel)

	if recCancel.Code != http.StatusOK {
		t.Errorf("expected 200 on cancel prescription, got %d", recCancel.Code)
	}
}

func TestPatientSoftDeleteAndGuardianValidation(t *testing.T) {
	s, cleanup := setupTestServer(t)
	defer cleanup()

	token, _ := s.issueToken(&User{ID: "u1", Name: "Admin", Role: "admin"})

	// RN-08: Minor without guardian should fail validation
	minorBody, _ := json.Marshal(map[string]any{
		"name":   "Niño Sin Tutor",
		"doc":    "DOC-MINOR-1",
		"birth":  "2020-01-01",
		"sedeId": "s1",
	})
	reqMinor := httptest.NewRequest("POST", "/api/patients", bytes.NewReader(minorBody))
	reqMinor.Header.Set("Authorization", "Bearer "+token)
	recMinor := httptest.NewRecorder()
	s.auth(s.handleCreatePatient)(recMinor, reqMinor)

	if recMinor.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for minor without guardian, got %d", recMinor.Code)
	}

	// Minor WITH guardian should succeed
	minorOkBody, _ := json.Marshal(map[string]any{
		"name":          "Niño Con Tutor",
		"doc":           "DOC-MINOR-2",
		"birth":         "2020-01-01",
		"sedeId":        "s1",
		"guardianName":  "Papá Tutor",
		"guardianPhone": "099123456",
		"guardianRel":   "Padre",
	})
	reqMinorOk := httptest.NewRequest("POST", "/api/patients", bytes.NewReader(minorOkBody))
	reqMinorOk.Header.Set("Authorization", "Bearer "+token)
	recMinorOk := httptest.NewRecorder()
	s.auth(s.handleCreatePatient)(recMinorOk, reqMinorOk)

	if recMinorOk.Code != http.StatusCreated {
		t.Fatalf("expected 201 for minor with guardian, got %d (%s)", recMinorOk.Code, recMinorOk.Body.String())
	}

	var created Patient
	_ = json.NewDecoder(recMinorOk.Body).Decode(&created)

	// RN-09: Soft delete patient
	reqDel := httptest.NewRequest("DELETE", "/api/patients/"+created.ID, nil)
	reqDel.SetPathValue("id", created.ID)
	reqDel.Header.Set("Authorization", "Bearer "+token)
	recDel := httptest.NewRecorder()
	s.auth(s.handleDeletePatient)(recDel, reqDel)

	if recDel.Code != http.StatusNoContent {
		t.Errorf("expected 204 on delete, got %d", recDel.Code)
	}

	// Verify patient is inactive in db (soft delete)
	var active bool
	err := s.db.QueryRow(`SELECT active FROM patients WHERE id = ?`, created.ID).Scan(&active)
	if err != nil {
		t.Fatalf("failed to query soft deleted patient: %v", err)
	}
	if active {
		t.Errorf("expected patient active = false, got true")
	}
}

func TestReportsSummary(t *testing.T) {
	s, cleanup := setupTestServer(t)
	defer cleanup()

	token, _ := s.issueToken(&User{ID: "u1", Name: "Admin", Role: "admin"})

	req := httptest.NewRequest("GET", "/api/reports/summary", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	s.auth(s.handleReportsSummary)(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on reports summary, got %d", rec.Code)
	}

	var summary ReportsSummary
	if err := json.NewDecoder(rec.Body).Decode(&summary); err != nil {
		t.Fatalf("failed to decode reports summary: %v", err)
	}
}

func TestRebindPostgres(t *testing.T) {
	cases := []struct {
		input    string
		postgres bool
		expected string
	}{
		{
			input:    "SELECT * FROM users WHERE email = ?",
			postgres: false,
			expected: "SELECT * FROM users WHERE email = ?",
		},
		{
			input:    "SELECT * FROM users WHERE email = ?",
			postgres: true,
			expected: "SELECT * FROM users WHERE email = $1",
		},
		{
			input:    "INSERT INTO users (id, name, email, password_hash, role, active, created_at) VALUES (?,?,?,?,?,true,?)",
			postgres: true,
			expected: "INSERT INTO users (id, name, email, password_hash, role, active, created_at) VALUES ($1,$2,$3,$4,$5,true,$6)",
		},
		{
			input:    "SELECT * FROM t WHERE col = 'is this ok?' AND val = ?",
			postgres: true,
			expected: "SELECT * FROM t WHERE col = 'is this ok?' AND val = $1",
		},
		{
			input:    "UPDATE t SET a = ?, b = ? WHERE id = ?",
			postgres: true,
			expected: "UPDATE t SET a = $1, b = $2 WHERE id = $3",
		},
	}

	for _, tc := range cases {
		got := rebind(tc.input, tc.postgres)
		if got != tc.expected {
			t.Errorf("rebind(%q, %v) = %q, expected %q", tc.input, tc.postgres, got, tc.expected)
		}
	}
}
