package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

type Server struct {
	db        *sql.DB
	secret    []byte
	staticDir string
	metaCache any
	sedesCache any
	profCache any
	chairsCache any
}

func main() {
	dbConnStr := env("SIGO_DB", "data/sigo-demo.db") // Cambiado para forzar nuevos datos seed
	secret := env("SIGO_JWT_SECRET", "sigo-dev-secret-change-in-production")
	addr := env("SIGO_ADDR", ":8080")
	staticDir := env("SIGO_WEB", filepath.Join("..", "web", "dist"))

	db, err := openDB(dbConnStr)
	if err != nil {
		log.Fatalf("no se pudo conectar a PostgreSQL: %v", err)
	}
	defer db.Close()
	if err := seed(db); err != nil {
		log.Fatalf("no se pudieron cargar los datos iniciales: %v", err)
	}

	s := &Server{db: db, secret: []byte(secret), staticDir: staticDir}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("POST /api/auth/login", s.handleLogin)

	mux.HandleFunc("GET /api/me", s.auth(s.handleMe))
	mux.HandleFunc("GET /api/meta", s.auth(s.handleMeta))
	mux.HandleFunc("GET /api/dashboard", s.auth(s.handleDashboard))

	mux.HandleFunc("GET /api/patients", s.auth(s.handlePatients))
	mux.HandleFunc("POST /api/patients", s.auth(s.handleCreatePatient))
	mux.HandleFunc("GET /api/patients/{id}", s.auth(s.handleGetPatient))
	mux.HandleFunc("PUT /api/patients/{id}", s.auth(s.handleUpdatePatient))
	mux.HandleFunc("DELETE /api/patients/{id}", s.auth(requireRole("admin")(s.handleDeletePatient)))

	mux.HandleFunc("GET /api/patients/{id}/odontogram", s.auth(s.handleOdontogram))
	mux.HandleFunc("PUT /api/patients/{id}/odontogram/{tooth}", s.auth(requireRole("admin", "odontologo")(s.handleSaveFinding)))

	mux.HandleFunc("GET /api/appointments", s.auth(s.handleAppointments))
	mux.HandleFunc("POST /api/appointments", s.auth(s.handleCreateAppointment))
	mux.HandleFunc("PATCH /api/appointments/{id}", s.auth(s.handleUpdateAppointment))

	mux.HandleFunc("GET /api/payments", s.auth(s.handlePayments))
	mux.HandleFunc("POST /api/payments", s.auth(requireRole("admin", "recepcion")(s.handleCreatePayment)))
	mux.HandleFunc("POST /api/cash/close", s.auth(requireRole("admin", "recepcion")(s.handleCloseCash)))
	mux.HandleFunc("GET /api/cash/count", s.auth(requireRole("admin", "recepcion")(s.handleCashCount)))
	mux.HandleFunc("GET /api/closures", s.auth(s.handleClosures))

	mux.HandleFunc("GET /api/audit", s.auth(requireRole("admin")(s.handleAudit)))
	mux.HandleFunc("GET /api/users", s.auth(requireRole("admin")(s.handleUsers)))
	mux.HandleFunc("POST /api/users", s.auth(requireRole("admin")(s.handleCreateUser)))

	// Periodontograma - RF-04
	mux.HandleFunc("GET /api/patients/{id}/periodontal-exams", s.auth(s.handlePeriodontalExams))
	mux.HandleFunc("POST /api/patients/{id}/periodontal-exams", s.auth(requireRole("admin", "odontologo")(s.handleCreatePeriodontalExam)))
	mux.HandleFunc("GET /api/periodontal-exams/{examId}/measurements", s.auth(s.handlePeriodontalMeasurements))
	mux.HandleFunc("POST /api/periodontal-exams/{examId}/measurements", s.auth(requireRole("admin", "odontologo")(s.handleSavePeriodontalMeasurement)))

	// SOEP Notes - RF-05
	mux.HandleFunc("GET /api/patients/{id}/soep-notes", s.auth(s.handleSOEPNotes))
	mux.HandleFunc("POST /api/patients/{id}/soep-notes", s.auth(requireRole("admin", "odontologo")(s.handleCreateSOEPNote)))

	// Treatment Budgets - RF-07
	mux.HandleFunc("GET /api/patients/{id}/treatment-budgets", s.auth(s.handleTreatmentBudgets))
	mux.HandleFunc("POST /api/patients/{id}/treatment-budgets", s.auth(s.handleCreateTreatmentBudget))
	mux.HandleFunc("POST /api/treatment-items/{itemId}/convert", s.auth(s.handleConvertItemToAppointment))

	// Inventory - RF-14
	mux.HandleFunc("GET /api/inventory", s.auth(s.handleInventory))
	mux.HandleFunc("POST /api/inventory", s.auth(requireRole("admin", "recepcion")(s.handleCreateInventoryItem)))
	mux.HandleFunc("POST /api/inventory/movements", s.auth(requireRole("admin", "recepcion")(s.handleInventoryMovement)))

	// Consentimientos - RF-06
	mux.HandleFunc("GET /api/patients/{id}/consents", s.auth(s.handleConsents))
	mux.HandleFunc("POST /api/patients/{id}/consents", s.auth(requireRole("admin", "odontologo")(s.handleCreateConsent)))

	// Comisiones - RF-13
	mux.HandleFunc("GET /api/commissions", s.auth(requireRole("admin")(s.handleCommissions)))

	// MFA / TOTP - RNF-05
	mux.HandleFunc("GET /api/totp/status", s.auth(s.handleGetTOTPStatus))
	mux.HandleFunc("POST /api/totp/setup", s.auth(s.handleSetupTOTP))
	mux.HandleFunc("POST /api/totp/enable", s.auth(s.handleEnableTOTP))
	mux.HandleFunc("POST /api/totp/disable", s.auth(s.handleDisableTOTP))

	// Notificaciones - RF-11
	mux.HandleFunc("GET /api/notifications", s.auth(s.handleNotifications))
	mux.HandleFunc("POST /api/notifications", s.auth(s.handleCreateNotification))
	mux.HandleFunc("POST /api/appointments/{id}/reminder", s.auth(s.handleSendReminder))

	// Facturación electrónica - RF-12
	mux.HandleFunc("GET /api/invoices", s.auth(s.handleInvoices))
	mux.HandleFunc("POST /api/invoices", s.auth(s.handleCreateInvoice))
	mux.HandleFunc("POST /api/invoices/{id}/issue", s.auth(s.handleIssueInvoice))

	// Adjuntos de pacientes (radiografías, fotos, documentos)
	mux.HandleFunc("GET /api/patients/{id}/attachments", s.auth(s.handlePatientAttachments))
	mux.HandleFunc("POST /api/patients/{id}/attachments", s.auth(s.handleCreatePatientAttachment))

	mux.Handle("/", spaHandler(staticDir))

	handler := withCORS(withLogging(mux))

	log.Printf("SIGO-Dental API escuchando en http://localhost%s", addr)
	log.Printf("base de datos: PostgreSQL")
	if _, err := os.Stat(filepath.Join(staticDir, "index.html")); err != nil {
		log.Printf("aviso: no se encontró el frontend compilado en %s (usá Vite en desarrollo o npm run build)", staticDir)
	}
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatal(err)
	}
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w, status: 200}
		next.ServeHTTP(sw, r)
		if strings.HasPrefix(r.URL.Path, "/api/") {
			log.Printf("%s %s → %d (%s)", r.Method, r.URL.Path, sw.status, time.Since(start).Round(time.Millisecond))
		}
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func withCORS(next http.Handler) http.Handler {
	allowed := map[string]bool{
		"http://localhost:5173": true,
		"http://127.0.0.1:5173": true,
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowed[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func spaHandler(dir string) http.Handler {
	absDir, err := filepath.Abs(dir)
	if err != nil {
		absDir = dir
	}
	fileServer := http.FileServer(http.Dir(absDir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			writeErr(w, 404, "ruta no encontrada")
			return
		}
		clean := filepath.Clean(strings.TrimPrefix(r.URL.Path, "/"))
		target := filepath.Join(absDir, clean)
		if strings.HasPrefix(target, absDir) {
			if info, err := os.Stat(target); err == nil && !info.IsDir() {
				fileServer.ServeHTTP(w, r)
				return
			}
		}
		index := filepath.Join(absDir, "index.html")
		if _, err := os.Stat(index); err != nil {
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("Frontend no compilado. Ejecutá: cd web && npm install && npm run build"))
			return
		}
		http.ServeFile(w, r, index)
	})
}
