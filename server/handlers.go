package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}

func decode(r *http.Request, v any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

func (s *Server) audit(userID, userName, action, entity, entityID, detail string) {
	_, err := s.db.Exec(`INSERT INTO audit (at, user_id, user_name, action, entity, entity_id, detail) VALUES (?,?,?,?,?,?,?)`,
		nowISO(), userID, userName, action, entity, entityID, detail)
	if err != nil {
		fmt.Println("audit error:", err)
	}
}

func (s *Server) currentUser(r *http.Request) *Claims {
	return claimsFrom(r)
}

/* ---------------- Meta ---------------- */

func (s *Server) handleMeta(w http.ResponseWriter, r *http.Request) {
	sedes := []Sede{}
	professionals := []Professional{}
	chairs := []Chair{}

	rows, err := s.db.Query(`SELECT id, name, address FROM sedes ORDER BY name`)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer las sedes")
		return
	}
	for rows.Next() {
		var x Sede
		if err := rows.Scan(&x.ID, &x.Name, &x.Address); err != nil {
			rows.Close()
			writeErr(w, 500, "no se pudieron leer las sedes")
			return
		}
		sedes = append(sedes, x)
	}
	rows.Close()

	rows, err = s.db.Query(`SELECT id, name, specialty, color FROM professionals ORDER BY name`)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer los profesionales")
		return
	}
	for rows.Next() {
		var x Professional
		if err := rows.Scan(&x.ID, &x.Name, &x.Specialty, &x.Color); err != nil {
			rows.Close()
			writeErr(w, 500, "no se pudieron leer los profesionales")
			return
		}
		professionals = append(professionals, x)
	}
	rows.Close()

	rows, err = s.db.Query(`SELECT id, name, sede_id FROM chairs ORDER BY sede_id, name`)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer los sillones")
		return
	}
	for rows.Next() {
		var x Chair
		if err := rows.Scan(&x.ID, &x.Name, &x.SedeID); err != nil {
			rows.Close()
			writeErr(w, 500, "no se pudieron leer los sillones")
			return
		}
		chairs = append(chairs, x)
	}
	rows.Close()

	writeJSON(w, 200, map[string]any{"sedes": sedes, "professionals": professionals, "chairs": chairs})
}

/* ---------------- Pacientes ---------------- */

func (s *Server) handlePatients(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	sede := strings.TrimSpace(r.URL.Query().Get("sede"))

	query := `SELECT id, name, doc, birth, phone, email, address, sede_id, allergies, notes, COALESCE(active, true), COALESCE(insurance, ''), COALESCE(guardian_name, ''), COALESCE(guardian_doc, ''), COALESCE(guardian_phone, ''), COALESCE(guardian_rel, ''), created_at FROM patients WHERE COALESCE(active, true) = true`
	args := []any{}
	if q != "" {
		query += ` AND (LOWER(name) LIKE ? OR doc LIKE ?)`
		like := "%" + strings.ToLower(q) + "%"
		args = append(args, like, "%"+q+"%")
	}
	if sede != "" {
		query += ` AND sede_id = ?`
		args = append(args, sede)
	}
	query += ` ORDER BY name COLLATE NOCASE`

	rows, err := s.db.Query(query, args...)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer los pacientes")
		return
	}
	defer rows.Close()

	items := []Patient{}
	for rows.Next() {
		var p Patient
		if err := rows.Scan(&p.ID, &p.Name, &p.Doc, &p.Birth, &p.Phone, &p.Email, &p.Address, &p.SedeID, &p.Allergies, &p.Notes, &p.Active, &p.Insurance, &p.GuardianName, &p.GuardianDoc, &p.GuardianPhone, &p.GuardianRel, &p.CreatedAt); err != nil {
			writeErr(w, 500, "no se pudieron leer los pacientes")
			return
		}
		items = append(items, p)
	}
	writeJSON(w, 200, items)
}

func validatePatient(p *Patient) string {
	p.Name = strings.TrimSpace(p.Name)
	p.Doc = strings.TrimSpace(p.Doc)
	p.Phone = strings.TrimSpace(p.Phone)
	p.Email = strings.TrimSpace(p.Email)
	p.Address = strings.TrimSpace(p.Address)
	p.Allergies = strings.TrimSpace(p.Allergies)
	p.Notes = strings.TrimSpace(p.Notes)
	p.Insurance = strings.TrimSpace(p.Insurance)
	p.GuardianName = strings.TrimSpace(p.GuardianName)
	p.GuardianDoc = strings.TrimSpace(p.GuardianDoc)
	p.GuardianPhone = strings.TrimSpace(p.GuardianPhone)
	p.GuardianRel = strings.TrimSpace(p.GuardianRel)

	if p.Name == "" || p.Doc == "" {
		return "nombre y documento son obligatorios"
	}
	if p.SedeID == "" {
		return "elegí una sede"
	}
	if p.Birth != "" {
		t, err := time.Parse("2006-01-02", p.Birth)
		if err != nil {
			return "fecha de nacimiento inválida"
		}
		// RN-08: Menores de 18 requieren tutor legal y teléfono
		ageYears := time.Since(t).Hours() / (24 * 365.25)
		if ageYears < 18 && (p.GuardianName == "" || p.GuardianPhone == "") {
			return "para pacientes menores de 18 años es obligatorio registrar nombre y teléfono del tutor legal"
		}
	}
	return ""
}

func (s *Server) handleCreatePatient(w http.ResponseWriter, r *http.Request) {
	var p Patient
	if err := decode(r, &p); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if msg := validatePatient(&p); msg != "" {
		writeErr(w, 400, msg)
		return
	}
	p.ID = uuid.NewString()
	p.CreatedAt = nowISO()
	p.Active = true

	_, err := s.db.Exec(`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, active, insurance, guardian_name, guardian_doc, guardian_phone, guardian_rel, created_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		p.ID, p.Name, p.Doc, p.Birth, p.Phone, p.Email, p.Address, p.SedeID, p.Allergies, p.Notes, p.Active, p.Insurance, p.GuardianName, p.GuardianDoc, p.GuardianPhone, p.GuardianRel, p.CreatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			writeErr(w, 409, "ya existe un paciente con ese documento")
			return
		}
		writeErr(w, 500, "no se pudo crear el paciente")
		return
	}

	c := s.currentUser(r)
	s.audit(c.UserID, c.Name, "CREAR", "patient", p.ID, "paciente "+p.Name)
	writeJSON(w, 201, p)
}

func (s *Server) getPatient(id string) (*Patient, error) {
	var p Patient
	err := s.db.QueryRow(`SELECT id, name, doc, birth, phone, email, address, sede_id, allergies, notes, COALESCE(active, true), COALESCE(insurance, ''), COALESCE(guardian_name, ''), COALESCE(guardian_doc, ''), COALESCE(guardian_phone, ''), COALESCE(guardian_rel, ''), created_at FROM patients WHERE id = ?`, id).
		Scan(&p.ID, &p.Name, &p.Doc, &p.Birth, &p.Phone, &p.Email, &p.Address, &p.SedeID, &p.Allergies, &p.Notes, &p.Active, &p.Insurance, &p.GuardianName, &p.GuardianDoc, &p.GuardianPhone, &p.GuardianRel, &p.CreatedAt)
	return &p, err
}

func (s *Server) handleGetPatient(w http.ResponseWriter, r *http.Request) {
	p, err := s.getPatient(r.PathValue("id"))
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, 404, "paciente no encontrado")
		return
	}
	if err != nil {
		writeErr(w, 500, "no se pudo leer el paciente")
		return
	}

	findings := []Finding{}
	rows, err := s.db.Query(`SELECT tooth, condition, surfaces, note, updated_at FROM findings WHERE patient_id = ? ORDER BY tooth`, p.ID)
	if err == nil {
		for rows.Next() {
			var f Finding
			var surfaces string
			if rows.Scan(&f.Tooth, &f.Condition, &surfaces, &f.Note, &f.UpdatedAt) == nil {
				f.Surfaces = splitSurfaces(surfaces)
				findings = append(findings, f)
			}
		}
		rows.Close()
	}

	appts := []Appointment{}
	rows, err = s.db.Query(`SELECT a.id, a.patient_id, p.name, COALESCE(p.allergies,''), a.professional_id, pr.name,
			a.chair_id, ch.name, a.date, a.time, a.reason, a.status, a.created_at
		FROM appointments a
		JOIN patients p ON p.id = a.patient_id
		JOIN professionals pr ON pr.id = a.professional_id
		JOIN chairs ch ON ch.id = a.chair_id
		WHERE a.patient_id = ? ORDER BY a.date DESC, a.time DESC LIMIT 20`, p.ID)
	if err == nil {
		for rows.Next() {
			var a Appointment
			if rows.Scan(&a.ID, &a.PatientID, &a.PatientName, &a.PatientAllergies, &a.ProfessionalID, &a.ProfessionalName,
				&a.ChairID, &a.ChairName, &a.Date, &a.Time, &a.Reason, &a.Status, &a.CreatedAt) == nil {
				appts = append(appts, a)
			}
		}
		rows.Close()
	}

	writeJSON(w, 200, map[string]any{"patient": p, "findings": findings, "appointments": appts})
}

func (s *Server) handleUpdatePatient(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if _, err := s.getPatient(id); errors.Is(err, sql.ErrNoRows) {
		writeErr(w, 404, "paciente no encontrado")
		return
	}
	var p Patient
	if err := decode(r, &p); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if msg := validatePatient(&p); msg != "" {
		writeErr(w, 400, msg)
		return
	}
	_, err := s.db.Exec(`UPDATE patients SET name=?, doc=?, birth=?, phone=?, email=?, address=?, sede_id=?, allergies=?, notes=?, insurance=?, guardian_name=?, guardian_doc=?, guardian_phone=?, guardian_rel=? WHERE id=?`,
		p.Name, p.Doc, p.Birth, p.Phone, p.Email, p.Address, p.SedeID, p.Allergies, p.Notes, p.Insurance, p.GuardianName, p.GuardianDoc, p.GuardianPhone, p.GuardianRel, id)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			writeErr(w, 409, "ya existe otro paciente con ese documento")
			return
		}
		writeErr(w, 500, "no se pudo actualizar el paciente")
		return
	}
	p.ID = id
	c := s.currentUser(r)
	s.audit(c.UserID, c.Name, "EDITAR", "patient", id, "paciente "+p.Name)
	writeJSON(w, 200, p)
}

func (s *Server) handleDeletePatient(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	p, err := s.getPatient(id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, 404, "paciente no encontrado")
		return
	}
	if err != nil {
		writeErr(w, 500, "no se pudo leer el paciente")
		return
	}
	// RN-09: Baja lógica en lugar de borrado físico
	if _, err := s.db.Exec(`UPDATE patients SET active = false WHERE id = ?`, id); err != nil {
		writeErr(w, 500, "no se pudo dar de baja el paciente")
		return
	}
	c := s.currentUser(r)
	s.audit(c.UserID, c.Name, "BAJA_LOGICA", "patient", id, "paciente "+p.Name)
	w.WriteHeader(http.StatusNoContent)
}

/* ---------------- Odontograma ---------------- */

func splitSurfaces(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return []string{}
	}
	return strings.Split(raw, ",")
}

func (s *Server) handleOdontogram(w http.ResponseWriter, r *http.Request) {
	patientID := r.PathValue("id")
	if _, err := s.getPatient(patientID); err != nil {
		writeErr(w, 404, "paciente no encontrado")
		return
	}
	rows, err := s.db.Query(`SELECT tooth, condition, surfaces, note, updated_at FROM findings WHERE patient_id = ? ORDER BY tooth`, patientID)
	if err != nil {
		writeErr(w, 500, "no se pudo leer el odontograma")
		return
	}
	defer rows.Close()
	items := []Finding{}
	for rows.Next() {
		var f Finding
		var surfaces string
		if rows.Scan(&f.Tooth, &f.Condition, &surfaces, &f.Note, &f.UpdatedAt) == nil {
			f.Surfaces = splitSurfaces(surfaces)
			items = append(items, f)
		}
	}
	writeJSON(w, 200, items)
}

func (s *Server) handleSaveFinding(w http.ResponseWriter, r *http.Request) {
	patientID := r.PathValue("id")
	tooth := r.PathValue("tooth")
	if !fdiTeeth[tooth] {
		writeErr(w, 400, "pieza dental inválida (notación FDI)")
		return
	}
	if _, err := s.getPatient(patientID); err != nil {
		writeErr(w, 404, "paciente no encontrado")
		return
	}

	var in struct {
		Condition string   `json:"condition"`
		Surfaces  []string `json:"surfaces"`
		Note      string   `json:"note"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	in.Condition = strings.TrimSpace(in.Condition)
	in.Note = strings.TrimSpace(in.Note)

	if in.Condition == "" {
		s.db.Exec(`DELETE FROM findings WHERE patient_id = ? AND tooth = ?`, patientID, tooth)
		c := s.currentUser(r)
		s.audit(c.UserID, c.Name, "QUITAR_HALLAZGO", "finding", patientID+":"+tooth, "diente "+tooth)
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if !validConditions[in.Condition] {
		writeErr(w, 400, "condición inválida")
		return
	}
	seen := map[string]bool{}
	clean := []string{}
	for _, surface := range in.Surfaces {
		if !validSurfaces[surface] {
			writeErr(w, 400, "superficie inválida")
			return
		}
		if !seen[surface] {
			seen[surface] = true
			clean = append(clean, surface)
		}
	}
	ts := nowISO()
	_, err := s.db.Exec(`INSERT INTO findings (patient_id, tooth, condition, surfaces, note, updated_at)
		VALUES (?,?,?,?,?,?)
		ON CONFLICT(patient_id, tooth) DO UPDATE SET condition=excluded.condition, surfaces=excluded.surfaces, note=excluded.note, updated_at=excluded.updated_at`,
		patientID, tooth, in.Condition, strings.Join(clean, ","), in.Note, ts)
	if err != nil {
		writeErr(w, 500, "no se pudo guardar el hallazgo")
		return
	}
	c := s.currentUser(r)
	s.audit(c.UserID, c.Name, "GUARDAR_HALLAZGO", "finding", patientID+":"+tooth, "diente "+tooth+" · "+in.Condition)
	writeJSON(w, 200, Finding{Tooth: tooth, Condition: in.Condition, Surfaces: clean, Note: in.Note, UpdatedAt: ts})
}

/* ---------------- Agenda ---------------- */

func (s *Server) handleAppointments(w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date")
	if date == "" {
		date = today()
	}
	if _, err := time.Parse("2006-01-02", date); err != nil {
		writeErr(w, 400, "fecha inválida")
		return
	}
	sede := r.URL.Query().Get("sede")
	
	limit := 100
	offset := 0
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}
	if raw := r.URL.Query().Get("offset"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n >= 0 {
			offset = n
		}
	}

	query := `SELECT a.id, a.patient_id, p.name, COALESCE(p.allergies,''), a.professional_id, pr.name,
			a.chair_id, ch.name, a.date, a.time, a.reason, a.status, a.created_at
		FROM appointments a
		JOIN patients p ON p.id = a.patient_id
		JOIN professionals pr ON pr.id = a.professional_id
		JOIN chairs ch ON ch.id = a.chair_id
		WHERE a.date = ?`
	args := []any{date}
	if sede != "" {
		query += ` AND p.sede_id = ?`
		args = append(args, sede)
	}
	query += ` ORDER BY a.time LIMIT ? OFFSET ?`
	args = append(args, limit, offset)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer los turnos")
		return
	}
	defer rows.Close()
	items := []Appointment{}
	for rows.Next() {
		var a Appointment
		if err := rows.Scan(&a.ID, &a.PatientID, &a.PatientName, &a.PatientAllergies, &a.ProfessionalID, &a.ProfessionalName,
			&a.ChairID, &a.ChairName, &a.Date, &a.Time, &a.Reason, &a.Status, &a.CreatedAt); err != nil {
			writeErr(w, 500, "no se pudieron leer los turnos")
			return
		}
		items = append(items, a)
	}
	writeJSON(w, 200, items)
}

func (s *Server) handleCreateAppointment(w http.ResponseWriter, r *http.Request) {
	var in struct {
		PatientID      string `json:"patientId"`
		ProfessionalID string `json:"professionalId"`
		ChairID        string `json:"chairId"`
		Date           string `json:"date"`
		Time           string `json:"time"`
		Reason         string `json:"reason"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if _, err := s.getPatient(in.PatientID); err != nil {
		writeErr(w, 400, "paciente inválido")
		return
	}
	if _, err := time.Parse("2006-01-02", in.Date); err != nil {
		writeErr(w, 400, "fecha inválida")
		return
	}
	if _, err := time.Parse("15:04", in.Time); err != nil {
		writeErr(w, 400, "hora inválida")
		return
	}
	var exists int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM professionals WHERE id=?`, in.ProfessionalID).Scan(&exists); err != nil || exists == 0 {
		writeErr(w, 400, "profesional inválido")
		return
	}
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM chairs WHERE id=?`, in.ChairID).Scan(&exists); err != nil || exists == 0 {
		writeErr(w, 400, "sillón inválido")
		return
	}

	var conflicts int
	// RN-03: Solo verificar sillón, no profesional (el sillón físico no puede tener dos citas simultáneas)
	err := s.db.QueryRow(`SELECT COUNT(*) FROM appointments
		WHERE date=? AND time=? AND chair_id=? AND status NOT IN ('CANCELADA', 'NO_SHOW')`,
		in.Date, in.Time, in.ChairID).Scan(&conflicts)
	if err != nil {
		writeErr(w, 500, "no se pudo validar la agenda")
		return
	}
	if conflicts > 0 {
		writeErr(w, 409, "ese horario ya está ocupado en el sillón seleccionado")
		return
	}

	id := uuid.NewString()
	now := nowISO()
	_, err = s.db.Exec(`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at)
		VALUES (?,?,?,?,?,?,?,'PROGRAMADA',?,?)`,
		id, in.PatientID, in.ProfessionalID, in.ChairID, in.Date, in.Time, strings.TrimSpace(in.Reason), now, now)
	if err != nil {
		writeErr(w, 500, "no se pudo crear el turno")
		return
	}
	c := s.currentUser(r)
	s.audit(c.UserID, c.Name, "CREAR", "appointment", id, "turno "+in.Date+" "+in.Time)
	writeJSON(w, 201, map[string]string{"id": id})
}

func allowedTransition(from, to string) bool {
	switch from {
	case "PROGRAMADA":
		return to == "CONFIRMADA" || to == "EN_SALA" || to == "CANCELADA"
	case "CONFIRMADA":
		return to == "EN_SALA" || to == "CANCELADA"
	case "EN_SALA":
		return to == "ATENDIDA"
	}
	return false
}

func (s *Server) handleUpdateAppointment(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var in struct {
		Status string `json:"status"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if !validStatuses[in.Status] {
		writeErr(w, 400, "estado inválido")
		return
	}
	var current string
	err := s.db.QueryRow(`SELECT status FROM appointments WHERE id=?`, id).Scan(&current)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, 404, "turno no encontrado")
		return
	}
	if err != nil {
		writeErr(w, 500, "no se pudo leer el turno")
		return
	}
	if !allowedTransition(current, in.Status) {
		writeErr(w, 409, "transición de estado no permitida")
		return
	}
	if _, err := s.db.Exec(`UPDATE appointments SET status=?, updated_at=? WHERE id=?`, in.Status, nowISO(), id); err != nil {
		writeErr(w, 500, "no se pudo actualizar el turno")
		return
	}
	c := s.currentUser(r)
	s.audit(c.UserID, c.Name, "CAMBIAR_ESTADO", "appointment", id, current+" → "+in.Status)
	writeJSON(w, 200, map[string]string{"id": id, "status": in.Status})
}

/* ---------------- Caja ---------------- */

func (s *Server) handlePayments(w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date")
	if date == "" {
		date = today()
	}
	rows, err := s.db.Query(`SELECT pay.id, pay.patient_id, p.name, pay.concept, pay.amount, pay.method, pay.date, pay.time, pay.closure_id, pay.created_by
		FROM payments pay JOIN patients p ON p.id = pay.patient_id
		WHERE pay.date = ? ORDER BY pay.time DESC`, date)
	if err != nil {
		writeErr(w, 500, "no se pudo leer la caja")
		return
	}
	defer rows.Close()
	items := []Payment{}
	for rows.Next() {
		var p Payment
		if rows.Scan(&p.ID, &p.PatientID, &p.Patient, &p.Concept, &p.Amount, &p.Method, &p.Date, &p.Time, &p.ClosureID, &p.CreatedBy) == nil {
			items = append(items, p)
		}
	}
	writeJSON(w, 200, items)
}

func (s *Server) handleCreatePayment(w http.ResponseWriter, r *http.Request) {
	var in struct {
		PatientID string  `json:"patientId"`
		Concept   string  `json:"concept"`
		Amount    float64 `json:"amount"`
		Method    string  `json:"method"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	in.Concept = strings.TrimSpace(in.Concept)
	in.Method = strings.TrimSpace(in.Method)
	if _, err := s.getPatient(in.PatientID); err != nil {
		writeErr(w, 400, "paciente inválido")
		return
	}
	if in.Concept == "" {
		writeErr(w, 400, "el concepto es obligatorio")
		return
	}
	if in.Amount <= 0 {
		writeErr(w, 400, "el monto debe ser mayor a cero")
		return
	}
	if in.Method == "" {
		writeErr(w, 400, "elegí un medio de pago")
		return
	}
	c := s.currentUser(r)
	p := Payment{
		ID: uuid.NewString(), PatientID: in.PatientID, Concept: in.Concept, Amount: in.Amount,
		Method: in.Method, Date: today(), Time: nowTime(), CreatedBy: c.Name,
	}
	_, err := s.db.Exec(`INSERT INTO payments (id, patient_id, concept, amount, method, date, time, closure_id, created_by)
		VALUES (?,?,?,?,?,?,?,'',?)`,
		p.ID, p.PatientID, p.Concept, p.Amount, p.Method, p.Date, p.Time, p.CreatedBy)
	if err != nil {
		writeErr(w, 500, "no se pudo registrar el cobro")
		return
	}
	s.audit(c.UserID, c.Name, "COBRAR", "payment", p.ID, p.Concept)
	writeJSON(w, 201, p)
}

func (s *Server) handleCloseCash(w http.ResponseWriter, r *http.Request) {
	date := today()
	var count int
	var total float64
	err := s.db.QueryRow(`SELECT COUNT(*), COALESCE(SUM(amount),0) FROM payments WHERE date=? AND closure_id=''`, date).Scan(&count, &total)
	if err != nil {
		writeErr(w, 500, "no se pudo leer la caja")
		return
	}
	if count == 0 {
		writeErr(w, 400, "no hay cobros abiertos para cerrar")
		return
	}
	id := uuid.NewString()
	now := nowISO()
	c := s.currentUser(r)
	tx, err := s.db.Begin()
	if err != nil {
		writeErr(w, 500, "no se pudo cerrar la caja")
		return
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`UPDATE payments SET closure_id=? WHERE date=? AND closure_id=''`, id, date); err != nil {
		writeErr(w, 500, "no se pudo cerrar la caja")
		return
	}
	if _, err := tx.Exec(`INSERT INTO closures (id, date, total, count, closed_at, closed_by) VALUES (?,?,?,?,?,?)`,
		id, date, total, count, now, c.Name); err != nil {
		writeErr(w, 500, "no se pudo cerrar la caja")
		return
	}
	if err := tx.Commit(); err != nil {
		writeErr(w, 500, "no se pudo cerrar la caja")
		return
	}
	s.audit(c.UserID, c.Name, "CERRAR_CAJA", "closure", id, fmt.Sprintf("%d cobros por %.2f", count, total))
	writeJSON(w, 201, Closure{ID: id, Date: date, Total: total, Count: count, ClosedAt: now, ClosedBy: c.Name})
}

func (s *Server) handleClosures(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(`SELECT id, date, total, count, closed_at, closed_by FROM closures ORDER BY closed_at DESC LIMIT 15`)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer los cierres")
		return
	}
	defer rows.Close()
	items := []Closure{}
	for rows.Next() {
		var c Closure
		if rows.Scan(&c.ID, &c.Date, &c.Total, &c.Count, &c.ClosedAt, &c.ClosedBy) == nil {
			items = append(items, c)
		}
	}
	writeJSON(w, 200, items)
}

/* ---------------- Panel ---------------- */

func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date")
	if date == "" {
		date = today()
	}
	sede := r.URL.Query().Get("sede")
	d := Dashboard{Date: date, Alerts: []Patient{}, TodayAppts: []Appointment{}, RecentPayments: []Payment{}, Upcoming: []Appointment{}}

	s.db.QueryRow(`SELECT COUNT(*) FROM patients`).Scan(&d.Patients)
	s.db.QueryRow(`SELECT COALESCE(SUM(amount),0) FROM payments WHERE date=?`, date).Scan(&d.Collected)

	sedeFilter := ""
	args := []any{date}
	if sede != "" {
		sedeFilter = " AND p.sede_id = ?"
		args = append(args, sede)
	}

	rows, err := s.db.Query(`SELECT a.id, a.patient_id, p.name, COALESCE(p.allergies,''), a.professional_id, pr.name,
			a.chair_id, ch.name, a.date, a.time, a.reason, a.status, a.created_at
		FROM appointments a
		JOIN patients p ON p.id=a.patient_id
		JOIN professionals pr ON pr.id=a.professional_id
		JOIN chairs ch ON ch.id=a.chair_id
		WHERE a.date=? AND a.status != 'CANCELADA'`+sedeFilter+` ORDER BY a.time`, args...)
	if err == nil {
		for rows.Next() {
			var a Appointment
			if rows.Scan(&a.ID, &a.PatientID, &a.PatientName, &a.PatientAllergies, &a.ProfessionalID, &a.ProfessionalName,
				&a.ChairID, &a.ChairName, &a.Date, &a.Time, &a.Reason, &a.Status, &a.CreatedAt) == nil {
				d.TodayAppts = append(d.TodayAppts, a)
				if a.Status == "PROGRAMADA" || a.Status == "CONFIRMADA" || a.Status == "EN_SALA" {
					d.Pending++
				}
			}
		}
		rows.Close()
	}
	d.Appointments = len(d.TodayAppts)

	rows, err = s.db.Query(`SELECT id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at
		FROM patients WHERE TRIM(LOWER(allergies)) NOT IN ('','ninguna','ninguno','sin alergias','no')
		ORDER BY name LIMIT 20`)
	if err == nil {
		for rows.Next() {
			var p Patient
			if rows.Scan(&p.ID, &p.Name, &p.Doc, &p.Birth, &p.Phone, &p.Email, &p.Address, &p.SedeID, &p.Allergies, &p.Notes, &p.CreatedAt) == nil {
				d.Alerts = append(d.Alerts, p)
			}
		}
		rows.Close()
	}
	d.AlertCount = len(d.Alerts)

	rows, err = s.db.Query(`SELECT pay.id, pay.patient_id, p.name, pay.concept, pay.amount, pay.method, pay.date, pay.time, pay.closure_id, pay.created_by
		FROM payments pay JOIN patients p ON p.id=pay.patient_id
		ORDER BY pay.date DESC, pay.time DESC LIMIT 5`)
	if err == nil {
		for rows.Next() {
			var p Payment
			if rows.Scan(&p.ID, &p.PatientID, &p.Patient, &p.Concept, &p.Amount, &p.Method, &p.Date, &p.Time, &p.ClosureID, &p.CreatedBy) == nil {
				d.RecentPayments = append(d.RecentPayments, p)
			}
		}
		rows.Close()
	}

	rows, err = s.db.Query(`SELECT a.id, a.patient_id, p.name, COALESCE(p.allergies,''), a.professional_id, pr.name,
			a.chair_id, ch.name, a.date, a.time, a.reason, a.status, a.created_at
		FROM appointments a
		JOIN patients p ON p.id=a.patient_id
		JOIN professionals pr ON pr.id=a.professional_id
		JOIN chairs ch ON ch.id=a.chair_id
		WHERE a.date >= ? AND a.status NOT IN ('CANCELADA','ATENDIDA')
		ORDER BY a.date, a.time LIMIT 5`, date)
	if err == nil {
		for rows.Next() {
			var a Appointment
			if rows.Scan(&a.ID, &a.PatientID, &a.PatientName, &a.PatientAllergies, &a.ProfessionalID, &a.ProfessionalName,
				&a.ChairID, &a.ChairName, &a.Date, &a.Time, &a.Reason, &a.Status, &a.CreatedAt) == nil {
				d.Upcoming = append(d.Upcoming, a)
			}
		}
		rows.Close()
	}

	s.db.QueryRow(`SELECT COUNT(*), COALESCE(SUM(amount),0) FROM payments WHERE date=? AND closure_id=''`, date).
		Scan(&d.OpenCashPayments, &d.OpenCashTotal)

	writeJSON(w, 200, d)
}

/* ---------------- Auditoría y usuarios ---------------- */

func (s *Server) handleAudit(w http.ResponseWriter, r *http.Request) {
	limit := 100
	offset := 0
	
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}
	
	if raw := r.URL.Query().Get("offset"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n >= 0 {
			offset = n
		}
	}
	
	rows, err := s.db.Query(`SELECT id, at, user_id, user_name, action, entity, entity_id, detail FROM audit ORDER BY id DESC LIMIT ? OFFSET ?`, limit, offset)
	if err != nil {
		writeErr(w, 500, "no se pudo leer la auditoría")
		return
	}
	defer rows.Close()
	items := []AuditEntry{}
	for rows.Next() {
		var a AuditEntry
		if rows.Scan(&a.ID, &a.At, &a.UserID, &a.UserName, &a.Action, &a.Entity, &a.EntityID, &a.Detail) == nil {
			items = append(items, a)
		}
	}
	writeJSON(w, 200, items)
}

func (s *Server) handleUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(`SELECT id, name, email, role, active, created_at FROM users ORDER BY name`)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer los usuarios")
		return
	}
	defer rows.Close()
	items := []User{}
	for rows.Next() {
		var u User
		if rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Active, &u.CreatedAt) == nil {
			items = append(items, u)
		}
	}
	writeJSON(w, 200, items)
}

func (s *Server) handleCreateUser(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if in.Name == "" || in.Email == "" {
		writeErr(w, 400, "nombre y email son obligatorios")
		return
	}
	if len(in.Password) < 6 {
		writeErr(w, 400, "la contraseña debe tener al menos 6 caracteres")
		return
	}
	if in.Role != "admin" && in.Role != "odontologo" && in.Role != "recepcion" {
		writeErr(w, 400, "rol inválido")
		return
	}
	hash, err := bcryptHash(in.Password)
	if err != nil {
		writeErr(w, 500, "no se pudo crear el usuario")
		return
	}
	id := uuid.NewString()
	_, err = s.db.Exec(`INSERT INTO users (id, name, email, password_hash, role, active, created_at) VALUES (?,?,?,?,?,true,?)`,
		id, in.Name, in.Email, hash, in.Role, nowISO())
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			writeErr(w, 409, "ya existe un usuario con ese email")
			return
		}
		writeErr(w, 500, "no se pudo crear el usuario")
		return
	}
	c := s.currentUser(r)
	s.audit(c.UserID, c.Name, "CREAR", "user", id, in.Email+" ("+in.Role+")")
	writeJSON(w, 201, User{ID: id, Name: in.Name, Email: in.Email, Role: in.Role, Active: true, CreatedAt: nowISO()})
}

/* ---------------- Periodontograma - RF-04 ---------------- */

func (s *Server) handlePeriodontalExams(w http.ResponseWriter, r *http.Request) {
	patientID := r.PathValue("id")
	rows, err := s.db.Query(`SELECT id, patient_id, exam_date, created_by, created_at FROM periodontal_exams WHERE patient_id = ? ORDER BY exam_date DESC`, patientID)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer los exámenes periodontales")
		return
	}
	defer rows.Close()
	exams := []PeriodontalExam{}
	for rows.Next() {
		var e PeriodontalExam
		if rows.Scan(&e.ID, &e.PatientID, &e.ExamDate, &e.CreatedBy, &e.CreatedAt) == nil {
			exams = append(exams, e)
		}
	}
	writeJSON(w, 200, exams)
}

func (s *Server) handleCreatePeriodontalExam(w http.ResponseWriter, r *http.Request) {
	patientID := r.PathValue("id")
	var in struct {
		ExamDate string `json:"examDate"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if in.ExamDate == "" {
		writeErr(w, 400, "la fecha del examen es obligatoria")
		return
	}
	c := s.currentUser(r)
	id := uuid.NewString()
	_, err := s.db.Exec(`INSERT INTO periodontal_exams (id, patient_id, exam_date, created_by, created_at) VALUES (?,?,?,?,?)`,
		id, patientID, in.ExamDate, c.Name, nowISO())
	if err != nil {
		writeErr(w, 500, "no se pudo crear el examen")
		return
	}
	s.audit(c.UserID, c.Name, "CREAR", "periodontal_exam", id, "paciente: "+patientID)
	writeJSON(w, 201, PeriodontalExam{ID: id, PatientID: patientID, ExamDate: in.ExamDate, CreatedBy: c.Name, CreatedAt: nowISO()})
}

func (s *Server) handlePeriodontalMeasurements(w http.ResponseWriter, r *http.Request) {
	examID := r.PathValue("examId")
	rows, err := s.db.Query(`SELECT id, exam_id, tooth, site, depth, bleeding, calculus FROM periodontal_measurements WHERE exam_id = ?`, examID)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer las mediciones")
		return
	}
	defer rows.Close()
	measurements := []PeriodontalMeasurement{}
	for rows.Next() {
		var m PeriodontalMeasurement
		if rows.Scan(&m.ID, &m.ExamID, &m.Tooth, &m.Site, &m.Depth, &m.Bleeding, &m.Calculus) == nil {
			measurements = append(measurements, m)
		}
	}
	writeJSON(w, 200, measurements)
}

func (s *Server) handleSavePeriodontalMeasurement(w http.ResponseWriter, r *http.Request) {
	examID := r.PathValue("examId")
	var in struct {
		Tooth    string `json:"tooth"`
		Site     string `json:"site"`
		Depth    int    `json:"depth"`
		Bleeding bool   `json:"bleeding"`
		Calculus bool   `json:"calculus"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if in.Tooth == "" || in.Site == "" {
		writeErr(w, 400, "diente y sitio son obligatorios")
		return
	}
	c := s.currentUser(r)
	id := uuid.NewString()
	_, err := s.db.Exec(`INSERT INTO periodontal_measurements (id, exam_id, tooth, site, depth, bleeding, calculus) VALUES (?,?,?,?,?,?,?)`,
		id, examID, in.Tooth, in.Site, in.Depth, in.Bleeding, in.Calculus)
	if err != nil {
		writeErr(w, 500, "no se pudo guardar la medición")
		return
	}
	s.audit(c.UserID, c.Name, "CREAR", "periodontal_measurement", id, "examen: "+examID)
	writeJSON(w, 201, PeriodontalMeasurement{ID: id, ExamID: examID, Tooth: in.Tooth, Site: in.Site, Depth: in.Depth, Bleeding: in.Bleeding, Calculus: in.Calculus})
}

/* ---------------- SOEP Notes - RF-05 ---------------- */

func (s *Server) handleSOEPNotes(w http.ResponseWriter, r *http.Request) {
	patientID := r.PathValue("id")
	rows, err := s.db.Query(`SELECT id, patient_id, subjective, objective, evaluation, plan, created_by, created_at, locked FROM soep_notes WHERE patient_id = ? ORDER BY created_at DESC`, patientID)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer las notas SOEP")
		return
	}
	defer rows.Close()
	notes := []SOEPNote{}
	for rows.Next() {
		var n SOEPNote
		if rows.Scan(&n.ID, &n.PatientID, &n.Subjective, &n.Objective, &n.Evaluation, &n.Plan, &n.CreatedBy, &n.CreatedAt, &n.Locked) == nil {
			notes = append(notes, n)
		}
	}
	writeJSON(w, 200, notes)
}

func (s *Server) handleCreateSOEPNote(w http.ResponseWriter, r *http.Request) {
	patientID := r.PathValue("id")
	var in struct {
		Subjective string `json:"subjective"`
		Objective  string `json:"objective"`
		Evaluation string `json:"evaluation"`
		Plan       string `json:"plan"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if in.Subjective == "" || in.Objective == "" || in.Evaluation == "" || in.Plan == "" {
		writeErr(w, 400, "todos los campos SOEP son obligatorios")
		return
	}
	c := s.currentUser(r)
	id := uuid.NewString()
	_, err := s.db.Exec(`INSERT INTO soep_notes (id, patient_id, subjective, objective, evaluation, plan, created_by, created_at, locked) VALUES (?,?,?,?,?,?,?,?,false)`,
		id, patientID, in.Subjective, in.Objective, in.Evaluation, in.Plan, c.Name, nowISO())
	if err != nil {
		writeErr(w, 500, "no se pudo crear la nota SOEP")
		return
	}
	s.audit(c.UserID, c.Name, "CREAR", "soep_note", id, "paciente: "+patientID)
	writeJSON(w, 201, SOEPNote{ID: id, PatientID: patientID, Subjective: in.Subjective, Objective: in.Objective, Evaluation: in.Evaluation, Plan: in.Plan, CreatedBy: c.Name, CreatedAt: nowISO(), Locked: false})
}

/* ---------------- Treatment Budgets - RF-07 ---------------- */

func (s *Server) handleTreatmentBudgets(w http.ResponseWriter, r *http.Request) {
	patientID := r.PathValue("id")
	rows, err := s.db.Query(`SELECT id, patient_id, total_amount, status, created_at, updated_at FROM treatment_budgets WHERE patient_id = ? ORDER BY created_at DESC`, patientID)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer los presupuestos")
		return
	}
	defer rows.Close()
	budgets := []TreatmentBudget{}
	for rows.Next() {
		var b TreatmentBudget
		if rows.Scan(&b.ID, &b.PatientID, &b.Total, &b.Status, &b.CreatedAt, &b.UpdatedAt) == nil {
			budgets = append(budgets, b)
		}
	}
	writeJSON(w, 200, budgets)
}

func (s *Server) handleCreateTreatmentBudget(w http.ResponseWriter, r *http.Request) {
	patientID := r.PathValue("id")
	var in struct {
		Total  float64 `json:"total"`
		Status string  `json:"status"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if in.Total <= 0 {
		writeErr(w, 400, "el total debe ser mayor a cero")
		return
	}
	if in.Status == "" {
		in.Status = "PENDIENTE"
	}
	c := s.currentUser(r)
	id := uuid.NewString()
	_, err := s.db.Exec(`INSERT INTO treatment_budgets (id, patient_id, total_amount, status, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
		id, patientID, in.Total, in.Status, nowISO(), nowISO())
	if err != nil {
		writeErr(w, 500, "no se pudo crear el presupuesto")
		return
	}
	s.audit(c.UserID, c.Name, "CREAR", "treatment_budget", id, "paciente: "+patientID)
	writeJSON(w, 201, TreatmentBudget{ID: id, PatientID: patientID, Total: in.Total, Status: in.Status, CreatedAt: nowISO(), UpdatedAt: nowISO()})
}

func (s *Server) handleTreatmentItems(w http.ResponseWriter, r *http.Request) {
	budgetID := r.PathValue("budgetId")
	rows, err := s.db.Query(`SELECT id, budget_id, description, amount, phase, approved, converted FROM treatment_items WHERE budget_id = ? ORDER BY phase, id`, budgetID)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer los ítems del presupuesto")
		return
	}
	defer rows.Close()

	items := []TreatmentItem{}
	for rows.Next() {
		var it TreatmentItem
		if err := rows.Scan(&it.ID, &it.BudgetID, &it.Description, &it.Amount, &it.Phase, &it.Approved, &it.Converted); err == nil {
			items = append(items, it)
		}
	}
	writeJSON(w, 200, items)
}

func (s *Server) handleCreateTreatmentItem(w http.ResponseWriter, r *http.Request) {
	budgetID := r.PathValue("budgetId")
	var in struct {
		Description string  `json:"description"`
		Amount      float64 `json:"amount"`
		Phase       string  `json:"phase"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if in.Description == "" || in.Amount <= 0 {
		writeErr(w, 400, "descripción y monto positivo son obligatorios")
		return
	}
	if in.Phase == "" {
		in.Phase = "Fase 1"
	}

	c := s.currentUser(r)
	id := uuid.NewString()
	_, err := s.db.Exec(`INSERT INTO treatment_items (id, budget_id, description, amount, phase, approved, converted) VALUES (?,?,?,?,?,false,false)`,
		id, budgetID, in.Description, in.Amount, in.Phase)
	if err != nil {
		writeErr(w, 500, "no se pudo crear el ítem del presupuesto")
		return
	}

	// Actualizar total del presupuesto
	_, _ = s.db.Exec(`UPDATE treatment_budgets SET total_amount = (SELECT COALESCE(SUM(amount), 0) FROM treatment_items WHERE budget_id = ?), updated_at = ? WHERE id = ?`,
		budgetID, nowISO(), budgetID)

	s.audit(c.UserID, c.Name, "CREAR", "treatment_item", id, "presupuesto: "+budgetID)
	writeJSON(w, 201, TreatmentItem{
		ID:          id,
		BudgetID:    budgetID,
		Description: in.Description,
		Amount:      in.Amount,
		Phase:       in.Phase,
		Approved:    false,
		Converted:   false,
	})
}

func (s *Server) handleApproveTreatmentItem(w http.ResponseWriter, r *http.Request) {
	itemID := r.PathValue("itemId")
	c := s.currentUser(r)

	res, err := s.db.Exec(`UPDATE treatment_items SET approved = true WHERE id = ?`, itemID)
	if err != nil {
		writeErr(w, 500, "no se pudo aprobar el ítem")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeErr(w, 404, "ítem no encontrado")
		return
	}

	s.audit(c.UserID, c.Name, "APROBAR", "treatment_item", itemID, "ítem aprobado")
	writeJSON(w, 200, map[string]string{"status": "ok", "itemId": itemID})
}

// RF-08: Convertir ítem aprobado a turno
func (s *Server) handleConvertItemToAppointment(w http.ResponseWriter, r *http.Request) {
	itemID := r.PathValue("itemId")
	var in struct {
		Date            string `json:"date"`
		Time            string `json:"time"`
		ProfessionalID  string `json:"professionalId"`
		ChairID         string `json:"chairId"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if in.Date == "" || in.Time == "" || in.ProfessionalID == "" || in.ChairID == "" {
		writeErr(w, 400, "fecha, hora, profesional y sillón son obligatorios")
		return
	}

	c := s.currentUser(r)

	// Obtener información del ítem
	var item struct {
		ID          string
		BudgetID    string
		Description string
		PatientID   string
	}
	err := s.db.QueryRow(`SELECT ti.id, ti.budget_id, ti.description, tb.patient_id FROM treatment_items ti JOIN treatment_budgets tb ON ti.budget_id = tb.id WHERE ti.id = ?`, itemID).Scan(&item.ID, &item.BudgetID, &item.Description, &item.PatientID)
	if err != nil {
		writeErr(w, 404, "ítem no encontrado")
		return
	}

	// Crear el turno
	appointmentID := uuid.NewString()
	_, err = s.db.Exec(`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
		appointmentID, item.PatientID, in.ProfessionalID, in.ChairID, in.Date, in.Time, item.Description, "PROGRAMADA", nowISO(), nowISO())
	if err != nil {
		writeErr(w, 500, "no se pudo crear el turno")
		return
	}

	// Marcar el ítem como convertido
	_, err = s.db.Exec(`UPDATE treatment_items SET converted = true WHERE id = ?`, itemID)
	if err != nil {
		writeErr(w, 500, "no se pudo marcar el ítem como convertido")
		return
	}

	s.audit(c.UserID, c.Name, "CONVERTIR", "treatment_item", itemID, "a turno: "+appointmentID)
	writeJSON(w, 201, map[string]string{"appointmentId": appointmentID, "itemId": itemID})
}

/* ---------------- Inventory - RF-14 ---------------- */

func (s *Server) handleInventory(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(`SELECT id, name, category, stock, min_stock, unit FROM inventory_items ORDER BY name`)
	if err != nil {
		writeErr(w, 500, "no se pudo leer el inventario")
		return
	}
	defer rows.Close()
	items := []InventoryItem{}
	for rows.Next() {
		var i InventoryItem
		if rows.Scan(&i.ID, &i.Name, &i.Category, &i.Stock, &i.MinStock, &i.Unit) == nil {
			items = append(items, i)
		}
	}
	writeJSON(w, 200, items)
}

func (s *Server) handleCreateInventoryItem(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name     string `json:"name"`
		Category string `json:"category"`
		Stock    int    `json:"stock"`
		MinStock int    `json:"minStock"`
		Unit     string `json:"unit"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		writeErr(w, 400, "el nombre es obligatorio")
		return
	}
	if in.Unit == "" {
		in.Unit = "unidad"
	}
	c := s.currentUser(r)
	id := uuid.NewString()
	_, err := s.db.Exec(`INSERT INTO inventory_items (id, name, category, stock, min_stock, unit) VALUES (?,?,?,?,?,?)`,
		id, in.Name, in.Category, in.Stock, in.MinStock, in.Unit)
	if err != nil {
		writeErr(w, 500, "no se pudo crear el ítem")
		return
	}
	s.audit(c.UserID, c.Name, "CREAR", "inventory_item", id, in.Name)
	writeJSON(w, 201, InventoryItem{ID: id, Name: in.Name, Category: in.Category, Stock: in.Stock, MinStock: in.MinStock, Unit: in.Unit})
}

func (s *Server) handleInventoryMovement(w http.ResponseWriter, r *http.Request) {
	var in struct {
		ItemID   string `json:"itemId"`
		Quantity int    `json:"quantity"`
		Type     string `json:"type"`
		Reason   string `json:"reason"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if in.ItemID == "" || in.Type == "" {
		writeErr(w, 400, "ítem y tipo son obligatorios")
		return
	}
	c := s.currentUser(r)
	id := uuid.NewString()
	
	tx, err := s.db.Begin()
	if err != nil {
		writeErr(w, 500, "no se pudo iniciar transacción")
		return
	}
	defer tx.Rollback()
	
	_, err = tx.Exec(`INSERT INTO inventory_movements (id, item_id, quantity, type, reason, created_at) VALUES (?,?,?,?,?,?)`,
		id, in.ItemID, in.Quantity, in.Type, in.Reason, nowISO())
	if err != nil {
		writeErr(w, 500, "no se pudo registrar el movimiento")
		return
	}
	
	// Actualizar stock
	sign := "+"
	if in.Type == "salida" {
		sign = "-"
	}
	_, err = tx.Exec(`UPDATE inventory_items SET stock = stock `+sign+`? WHERE id = ?`, in.Quantity, in.ItemID)
	if err != nil {
		writeErr(w, 500, "no se pudo actualizar el stock")
		return
	}
	
	if err := tx.Commit(); err != nil {
		writeErr(w, 500, "no se pudo completar el movimiento")
		return
	}
	
	s.audit(c.UserID, c.Name, "CREAR", "inventory_movement", id, fmt.Sprintf("ítem: %s cantidad: %d", in.ItemID, in.Quantity))
	writeJSON(w, 201, InventoryMovement{ID: id, ItemID: in.ItemID, Quantity: in.Quantity, Type: in.Type, Reason: in.Reason, CreatedAt: nowISO()})
}

/* ---------------- MFA / TOTP - RNF-05 ---------------- */

func (s *Server) handleSetupTOTP(w http.ResponseWriter, r *http.Request) {
	c := s.currentUser(r)
	
	// Generar secret TOTP
	secret := generateTOTPSecret()
	
	// Verificar si ya existe TOTP para el usuario
	var existingTOTP UserTOTP
	err := s.db.QueryRow(`SELECT user_id, secret, enabled, backup_codes, created_at FROM user_totp WHERE user_id = ?`, c.UserID).Scan(&existingTOTP.UserID, &existingTOTP.Secret, &existingTOTP.Enabled, &existingTOTP.BackupCodes, &existingTOTP.CreatedAt)
	
	if err == sql.ErrNoRows {
		// Crear nuevo registro
		backupCodes := generateBackupCodes()
		_, err = s.db.Exec(`INSERT INTO user_totp (user_id, secret, enabled, backup_codes, created_at) VALUES (?,?,?,?,?)`,
			c.UserID, secret, false, backupCodes, nowISO())
		if err != nil {
			writeErr(w, 500, "no se pudo configurar TOTP")
			return
		}
		s.audit(c.UserID, c.Name, "TOTP_SETUP", "user_totp", c.UserID, "secret generado")
		writeJSON(w, 200, map[string]interface{}{
			"secret": secret,
			"backupCodes": backupCodes,
			"enabled": false,
		})
	} else if err == nil {
		// Ya existe, devolver el secret actual
		writeJSON(w, 200, map[string]interface{}{
			"secret": existingTOTP.Secret,
			"backupCodes": existingTOTP.BackupCodes,
			"enabled": existingTOTP.Enabled,
		})
	} else {
		writeErr(w, 500, "error al verificar TOTP")
		return
	}
}

func (s *Server) handleEnableTOTP(w http.ResponseWriter, r *http.Request) {
	c := s.currentUser(r)
	var in struct {
		Code string `json:"code"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	
	// Obtener secret del usuario
	var secret string
	err := s.db.QueryRow(`SELECT secret FROM user_totp WHERE user_id = ?`, c.UserID).Scan(&secret)
	if err != nil {
		writeErr(w, 404, "TOTP no configurado")
		return
	}
	
	// Verificar código (implementación simplificada)
	if !verifyTOTP(secret, in.Code) {
		writeErr(w, 401, "código inválido")
		return
	}
	
	// Habilitar TOTP
	_, err = s.db.Exec(`UPDATE user_totp SET enabled = true WHERE user_id = ?`, c.UserID)
	if err != nil {
		writeErr(w, 500, "no se pudo habilitar TOTP")
		return
	}
	
	s.audit(c.UserID, c.Name, "TOTP_ENABLE", "user_totp", c.UserID, "TOTP habilitado")
	writeJSON(w, 200, map[string]bool{"enabled": true})
}

func (s *Server) handleDisableTOTP(w http.ResponseWriter, r *http.Request) {
	c := s.currentUser(r)
	
	_, err := s.db.Exec(`UPDATE user_totp SET enabled = false WHERE user_id = ?`, c.UserID)
	if err != nil {
		writeErr(w, 500, "no se pudo deshabilitar TOTP")
		return
	}
	
	s.audit(c.UserID, c.Name, "TOTP_DISABLE", "user_totp", c.UserID, "TOTP deshabilitado")
	writeJSON(w, 200, map[string]bool{"enabled": false})
}

/* ---------------- Notificaciones - RF-11 ---------------- */

func (s *Server) handleNotifications(w http.ResponseWriter, r *http.Request) {
	limit := 100
	offset := 0
	
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}
	
	if raw := r.URL.Query().Get("offset"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n >= 0 {
			offset = n
		}
	}
	
	rows, err := s.db.Query(`SELECT id, patient_id, type, channel, status, message, scheduled_at, sent_at, created_at FROM notifications ORDER BY created_at DESC LIMIT ? OFFSET ?`, limit, offset)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer las notificaciones")
		return
	}
	defer rows.Close()
	items := []Notification{}
	for rows.Next() {
		var n Notification
		if rows.Scan(&n.ID, &n.PatientID, &n.Type, &n.Channel, &n.Status, &n.Message, &n.ScheduledAt, &n.SentAt, &n.CreatedAt) == nil {
			items = append(items, n)
		}
	}
	writeJSON(w, 200, items)
}

func (s *Server) handleCreateNotification(w http.ResponseWriter, r *http.Request) {
	var in struct {
		PatientID   string `json:"patientId"`
		Type        string `json:"type"`
		Channel     string `json:"channel"`
		Message     string `json:"message"`
		ScheduledAt string `json:"scheduledAt"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if in.PatientID == "" || in.Type == "" || in.Channel == "" || in.Message == "" {
		writeErr(w, 400, "paciente, tipo, canal y mensaje son obligatorios")
		return
	}
	if in.ScheduledAt == "" {
		in.ScheduledAt = nowISO()
	}
	
	c := s.currentUser(r)
	id := uuid.NewString()
	_, err := s.db.Exec(`INSERT INTO notifications (id, patient_id, type, channel, status, message, scheduled_at, created_at) VALUES (?,?,?,?,?,?,?,?)`,
		id, in.PatientID, in.Type, in.Channel, "pending", in.Message, in.ScheduledAt, nowISO())
	if err != nil {
		writeErr(w, 500, "no se pudo crear la notificación")
		return
	}
	
	s.audit(c.UserID, c.Name, "CREAR", "notification", id, "paciente: "+in.PatientID)
	writeJSON(w, 201, Notification{ID: id, PatientID: in.PatientID, Type: in.Type, Channel: in.Channel, Status: "pending", Message: in.Message, ScheduledAt: in.ScheduledAt, CreatedAt: nowISO()})
}

func (s *Server) handleSendReminder(w http.ResponseWriter, r *http.Request) {
	appointmentID := r.PathValue("id")
	
	// Obtener datos del turno
	var patientName, patientPhone, appointmentDate, appointmentTime string
	err := s.db.QueryRow(`SELECT p.name, p.phone, a.date, a.time FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE a.id = ?`, appointmentID).
		Scan(&patientName, &patientPhone, &appointmentDate, &appointmentTime)
	if err != nil {
		writeErr(w, 404, "turno no encontrado")
		return
	}
	
	// Crear notificación de recordatorio
	c := s.currentUser(r)
	id := uuid.NewString()
	message := fmt.Sprintf("Recordatorio de turno: %s el %s a las %s. Por favor confirmar su asistencia.", patientName, appointmentDate, appointmentTime)
	
	_, err = s.db.Exec(`INSERT INTO notifications (id, patient_id, type, channel, status, message, scheduled_at, created_at) VALUES (?,?,?,?,?,?,?,?)`,
		id, appointmentID, "reminder", "whatsapp", "pending", message, nowISO(), nowISO())
	if err != nil {
		writeErr(w, 500, "no se pudo crear el recordatorio")
		return
	}
	
	s.audit(c.UserID, c.Name, "RECORDATORIO", "notification", id, "turno: "+appointmentID)
	writeJSON(w, 201, map[string]string{"notificationId": id, "message": "Recordatorio programado. Pendiente integración con WhatsApp API."})
}

/* ---------------- Facturación electrónica - RF-12 ---------------- */

func (s *Server) handleInvoices(w http.ResponseWriter, r *http.Request) {
	limit := 100
	offset := 0
	
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}
	
	if raw := r.URL.Query().Get("offset"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n >= 0 {
			offset = n
		}
	}
	
	rows, err := s.db.Query(`SELECT id, patient_id, payment_id, number, amount, tax, total, cae, cae_due, status, created_at, issued_at FROM invoices ORDER BY created_at DESC LIMIT ? OFFSET ?`, limit, offset)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer las facturas")
		return
	}
	defer rows.Close()
	items := []Invoice{}
	for rows.Next() {
		var inv Invoice
		if rows.Scan(&inv.ID, &inv.PatientID, &inv.PaymentID, &inv.Number, &inv.Amount, &inv.Tax, &inv.Total, &inv.CAE, &inv.CAEDue, &inv.Status, &inv.CreatedAt, &inv.IssuedAt) == nil {
			items = append(items, inv)
		}
	}
	writeJSON(w, 200, items)
}

func (s *Server) handleCreateInvoice(w http.ResponseWriter, r *http.Request) {
	var in struct {
		PaymentID string  `json:"paymentId"`
		Amount    float64 `json:"amount"`
		Tax       float64 `json:"tax"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if in.PaymentID == "" || in.Amount <= 0 {
		writeErr(w, 400, "pago y monto son obligatorios")
		return
	}
	
	c := s.currentUser(r)
	id := uuid.NewString()
	total := in.Amount + in.Tax
	
	// Generar número de factura (simplificado)
	number := fmt.Sprintf("F-%d", time.Now().Unix())
	
	_, err := s.db.Exec(`INSERT INTO invoices (id, patient_id, payment_id, number, amount, tax, total, cae, cae_due, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		id, "", in.PaymentID, number, in.Amount, in.Tax, total, "", "", "draft", nowISO())
	if err != nil {
		writeErr(w, 500, "no se pudo crear la factura")
		return
	}
	
	s.audit(c.UserID, c.Name, "CREAR", "invoice", id, "pago: "+in.PaymentID)
	writeJSON(w, 201, Invoice{ID: id, PatientID: "", PaymentID: in.PaymentID, Number: number, Amount: in.Amount, Tax: in.Tax, Total: total, CAE: "", CAEDue: "", Status: "draft", CreatedAt: nowISO()})
}

func (s *Server) handleCashCount(w http.ResponseWriter, r *http.Request) {
	date := today()
	var count int
	err := s.db.QueryRow(`SELECT COUNT(*) FROM payments WHERE date=? AND closure_id=''`, date).Scan(&count)
	if err != nil {
		writeErr(w, 500, "no se pudo leer la caja")
		return
	}
	writeJSON(w, 200, map[string]int{"count": count})
}

func (s *Server) handleIssueInvoice(w http.ResponseWriter, r *http.Request) {
	invoiceID := r.PathValue("id")
	
	// En una implementación completa, aquí se llamaría a la API de AFIP/fiscal local
	// Por ahora, simulamos la emisión
	
	c := s.currentUser(r)
	_, err := s.db.Exec(`UPDATE invoices SET status = 'issued', issued_at = ?, cae = 'SIMULADO' WHERE id = ?`, nowISO(), invoiceID)
	if err != nil {
		writeErr(w, 500, "no se pudo emitir la factura")
		return
	}
	
	s.audit(c.UserID, c.Name, "EMITIR", "invoice", invoiceID, "factura emitida (simulado)")
	writeJSON(w, 200, map[string]string{"status": "issued", "cae": "SIMULADO", "message": "Factura emitida. Pendiente integración con AFIP/fiscal local."})
}

/* ---------------- Adjuntos de pacientes (radiografías, fotos, documentos) ---------------- */

func (s *Server) handlePatientAttachments(w http.ResponseWriter, r *http.Request) {
	patientID := r.PathValue("id")
	rows, err := s.db.Query(`SELECT id, patient_id, type, file_name, file_url, file_size, notes, created_at, created_by FROM patient_attachments WHERE patient_id = ? ORDER BY created_at DESC`, patientID)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer los adjuntos")
		return
	}
	defer rows.Close()
	items := []PatientAttachment{}
	for rows.Next() {
		var a PatientAttachment
		if rows.Scan(&a.ID, &a.PatientID, &a.Type, &a.FileName, &a.FileURL, &a.FileSize, &a.Notes, &a.CreatedAt, &a.CreatedBy) == nil {
			items = append(items, a)
		}
	}
	writeJSON(w, 200, items)
}

func (s *Server) handleCreatePatientAttachment(w http.ResponseWriter, r *http.Request) {
	patientID := r.PathValue("id")
	var in struct {
		Type     string `json:"type"`
		FileName string `json:"fileName"`
		FileURL  string `json:"fileUrl"`
		FileSize int64  `json:"fileSize"`
		Notes    string `json:"notes"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if in.Type == "" || in.FileName == "" || in.FileURL == "" {
		writeErr(w, 400, "tipo, nombre de archivo y URL son obligatorios")
		return
	}
	
	c := s.currentUser(r)
	id := uuid.NewString()
	_, err := s.db.Exec(`INSERT INTO patient_attachments (id, patient_id, type, file_name, file_url, file_size, notes, created_at, created_by) VALUES (?,?,?,?,?,?,?,?,?)`,
		id, patientID, in.Type, in.FileName, in.FileURL, in.FileSize, in.Notes, nowISO(), c.Name)
	if err != nil {
		writeErr(w, 500, "no se pudo crear el adjunto")
		return
	}
	
	s.audit(c.UserID, c.Name, "CREAR", "patient_attachment", id, "paciente: "+patientID)
	writeJSON(w, 201, PatientAttachment{ID: id, PatientID: patientID, Type: in.Type, FileName: in.FileName, FileURL: in.FileURL, FileSize: in.FileSize, Notes: in.Notes, CreatedAt: nowISO(), CreatedBy: c.Name})
}

func (s *Server) handleGetTOTPStatus(w http.ResponseWriter, r *http.Request) {
	c := s.currentUser(r)
	
	var totp UserTOTP
	err := s.db.QueryRow(`SELECT user_id, secret, enabled, backup_codes, created_at FROM user_totp WHERE user_id = ?`, c.UserID).Scan(&totp.UserID, &totp.Secret, &totp.Enabled, &totp.BackupCodes, &totp.CreatedAt)
	
	if err == sql.ErrNoRows {
		writeJSON(w, 200, map[string]interface{}{
			"enabled": false,
			"configured": false,
		})
		return
	}
	
	if err != nil {
		writeErr(w, 500, "error al verificar TOTP")
		return
	}
	
	writeJSON(w, 200, map[string]interface{}{
		"enabled": totp.Enabled,
		"configured": true,
	})
}

/* ---------------- Consentimientos - RF-06 ---------------- */

func (s *Server) handleConsents(w http.ResponseWriter, r *http.Request) {
	patientID := r.PathValue("id")
	rows, err := s.db.Query(`SELECT id, patient_id, procedure, content, signed_at, signed_by, created_at FROM consents WHERE patient_id = ? ORDER BY created_at DESC`, patientID)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer los consentimientos")
		return
	}
	defer rows.Close()
	consents := []Consent{}
	for rows.Next() {
		var c Consent
		if rows.Scan(&c.ID, &c.PatientID, &c.Procedure, &c.Content, &c.SignedAt, &c.SignedBy, &c.CreatedAt) == nil {
			consents = append(consents, c)
		}
	}
	writeJSON(w, 200, consents)
}

func (s *Server) handleCreateConsent(w http.ResponseWriter, r *http.Request) {
	patientID := r.PathValue("id")
	var in struct {
		Procedure string `json:"procedure"`
		Content   string `json:"content"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if in.Procedure == "" || in.Content == "" {
		writeErr(w, 400, "procedimiento y contenido son obligatorios")
		return
	}
	c := s.currentUser(r)
	id := uuid.NewString()
	_, err := s.db.Exec(`INSERT INTO consents (id, patient_id, procedure, content, signed_at, signed_by, created_at) VALUES (?,?,?,?,?,?,?)`,
		id, patientID, in.Procedure, in.Content, nowISO(), c.Name, nowISO())
	if err != nil {
		writeErr(w, 500, "no se pudo crear el consentimiento")
		return
	}
	s.audit(c.UserID, c.Name, "CREAR", "consent", id, "paciente: "+patientID)
	writeJSON(w, 201, Consent{ID: id, PatientID: patientID, Procedure: in.Procedure, Content: in.Content, SignedAt: nowISO(), SignedBy: c.Name, CreatedAt: nowISO()})
}

/* ---------------- Comisiones - RF-13 ---------------- */

func (s *Server) handleCommissions(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(`SELECT id, professional_id, amount, payment_id, date, created_at FROM commissions ORDER BY date DESC`)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer las comisiones")
		return
	}
	defer rows.Close()
	commissions := []Commission{}
	for rows.Next() {
		var comm Commission
		if rows.Scan(&comm.ID, &comm.ProfessionalID, &comm.Amount, &comm.PaymentID, &comm.Date, &comm.CreatedAt) == nil {
			commissions = append(commissions, comm)
		}
	}
	writeJSON(w, 200, commissions)
}

/* ---------------- Recetas Digitales - RF-21 ---------------- */

func (s *Server) handlePatientPrescriptions(w http.ResponseWriter, r *http.Request) {
	patientID := r.PathValue("id")
	rows, err := s.db.Query(`SELECT pr.id, pr.patient_id, p.name, pr.professional_id, COALESCE(prof.name, 'Profesional'), pr.medication, pr.dose, pr.route, pr.frequency, pr.duration, pr.instructions, pr.status, pr.created_at, pr.cancelled_reason
		FROM prescriptions pr
		JOIN patients p ON p.id = pr.patient_id
		LEFT JOIN professionals prof ON prof.id = pr.professional_id
		WHERE pr.patient_id = ? ORDER BY pr.created_at DESC`, patientID)
	if err != nil {
		writeErr(w, 500, "no se pudieron leer las recetas")
		return
	}
	defer rows.Close()

	items := []Prescription{}
	for rows.Next() {
		var rx Prescription
		if err := rows.Scan(&rx.ID, &rx.PatientID, &rx.PatientName, &rx.ProfessionalID, &rx.ProfessionalName, &rx.Medication, &rx.Dose, &rx.Route, &rx.Frequency, &rx.Duration, &rx.Instructions, &rx.Status, &rx.CreatedAt, &rx.CancelledReason); err == nil {
			items = append(items, rx)
		}
	}
	writeJSON(w, 200, items)
}

func (s *Server) handleCreatePrescription(w http.ResponseWriter, r *http.Request) {
	patientID := r.PathValue("id")
	patient, err := s.getPatient(patientID)
	if err != nil {
		writeErr(w, 404, "paciente no encontrado")
		return
	}

	var in struct {
		ProfessionalID string `json:"professionalId"`
		Medication     string `json:"medication"`
		Dose           string `json:"dose"`
		Route          string `json:"route"`
		Frequency      string `json:"frequency"`
		Duration       string `json:"duration"`
		Instructions   string `json:"instructions"`
		IgnoreWarning  bool   `json:"ignoreWarning"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, 400, "datos inválidos")
		return
	}
	if in.Medication == "" || in.Dose == "" || in.Frequency == "" || in.Duration == "" {
		writeErr(w, 400, "medicamento, dosis, frecuencia y duración son obligatorios")
		return
	}

	// RF-02 y RF-21: Alerta médica cruzada de alergias del paciente
	if !in.IgnoreWarning && patient.Allergies != "" {
		medLower := strings.ToLower(in.Medication)
		allLower := strings.ToLower(patient.Allergies)
		if (strings.Contains(medLower, "amoxi") && strings.Contains(allLower, "penicil")) ||
			strings.Contains(allLower, medLower) ||
			strings.Contains(medLower, allLower) {
			writeJSON(w, 409, map[string]any{
				"error":   "ALERTA_ALERGIA",
				"message": fmt.Sprintf("¡Alerta médica! El paciente presenta alergia registrada: '%s'. Confirme si desea prescribir con justificación profesional.", patient.Allergies),
			})
			return
		}
	}

	c := s.currentUser(r)
	profID := in.ProfessionalID
	if profID == "" {
		profID = "pr1"
	}

	id := uuid.NewString()
	route := in.Route
	if route == "" {
		route = "Oral"
	}

	_, err = s.db.Exec(`INSERT INTO prescriptions (id, patient_id, professional_id, medication, dose, route, frequency, duration, instructions, status, created_at, cancelled_reason)
		VALUES (?,?,?,?,?,?,?,?,?,'activa',?,'')`,
		id, patientID, profID, in.Medication, in.Dose, route, in.Frequency, in.Duration, in.Instructions, nowISO())
	if err != nil {
		writeErr(w, 500, "no se pudo registrar la receta")
		return
	}

	s.audit(c.UserID, c.Name, "CREAR", "prescription", id, fmt.Sprintf("paciente %s: %s %s", patient.Name, in.Medication, in.Dose))
	writeJSON(w, 201, Prescription{
		ID:             id,
		PatientID:      patientID,
		PatientName:    patient.Name,
		ProfessionalID: profID,
		Medication:     in.Medication,
		Dose:           in.Dose,
		Route:          route,
		Frequency:      in.Frequency,
		Duration:       in.Duration,
		Instructions:   in.Instructions,
		Status:         "activa",
		CreatedAt:      nowISO(),
	})
}

func (s *Server) handleCancelPrescription(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var in struct {
		Reason string `json:"reason"`
	}
	if err := decode(r, &in); err != nil || in.Reason == "" {
		writeErr(w, 400, "el motivo de anulación es obligatorio")
		return
	}

	c := s.currentUser(r)
	res, err := s.db.Exec(`UPDATE prescriptions SET status = 'anulada', cancelled_reason = ? WHERE id = ?`, in.Reason, id)
	if err != nil {
		writeErr(w, 500, "no se pudo anular la receta")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeErr(w, 404, "receta no encontrada")
		return
	}

	s.audit(c.UserID, c.Name, "ANULAR", "prescription", id, "motivo: "+in.Reason)
	writeJSON(w, 200, map[string]string{"status": "anulada", "id": id})
}

/* ---------------- Reportes Operativos y Financieros - RF-22 ---------------- */

func (s *Server) handleReportsSummary(w http.ResponseWriter, r *http.Request) {
	from := strings.TrimSpace(r.URL.Query().Get("from"))
	to := strings.TrimSpace(r.URL.Query().Get("to"))
	sede := strings.TrimSpace(r.URL.Query().Get("sede"))

	if from == "" {
		from = time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	}
	if to == "" {
		to = time.Now().Format("2006-01-02")
	}

	summary := ReportsSummary{
		From:                     from,
		To:                       to,
		RevenueByMethod:          []NameValue{},
		AppointmentsByStatus:     []NameValue{},
		ProductionByProfessional: []ProfessionalProduction{},
	}

	// 1. Ingresos y pagos
	payQuery := `SELECT COALESCE(SUM(amount), 0), COUNT(id) FROM payments WHERE date >= ? AND date <= ?`
	payArgs := []any{from, to}
	_ = s.db.QueryRow(payQuery, payArgs...).Scan(&summary.TotalRevenue, &summary.TotalPayments)

	// 2. Ingresos por método de pago
	methodQuery := `SELECT method, COALESCE(SUM(amount), 0) FROM payments WHERE date >= ? AND date <= ? GROUP BY method`
	rows, err := s.db.Query(methodQuery, from, to)
	if err == nil {
		for rows.Next() {
			var nv NameValue
			if rows.Scan(&nv.Name, &nv.Value) == nil {
				summary.RevenueByMethod = append(summary.RevenueByMethod, nv)
			}
		}
		rows.Close()
	}

	// 3. Citas por estado
	apptQuery := `SELECT a.status, COUNT(a.id) FROM appointments a WHERE a.date >= ? AND a.date <= ?`
	apptArgs := []any{from, to}
	if sede != "" {
		apptQuery += ` AND a.chair_id IN (SELECT id FROM chairs WHERE sede_id = ?)`
		apptArgs = append(apptArgs, sede)
	}
	apptQuery += ` GROUP BY a.status`
	rows, err = s.db.Query(apptQuery, apptArgs...)
	if err == nil {
		for rows.Next() {
			var nv NameValue
			var count int
			if rows.Scan(&nv.Name, &count) == nil {
				nv.Value = float64(count)
				summary.AppointmentsByStatus = append(summary.AppointmentsByStatus, nv)
			}
		}
		rows.Close()
	}

	// 4. Producción por profesional
	prodQuery := `SELECT pr.id, pr.name, COUNT(a.id) as appts, COALESCE(SUM(p.amount), 0) as total
		FROM professionals pr
		LEFT JOIN appointments a ON a.professional_id = pr.id AND a.date >= ? AND a.date <= ?
		LEFT JOIN payments p ON p.patient_id = a.patient_id AND p.date = a.date
		GROUP BY pr.id, pr.name`
	rows, err = s.db.Query(prodQuery, from, to)
	if err == nil {
		for rows.Next() {
			var pp ProfessionalProduction
			if rows.Scan(&pp.ProfessionalID, &pp.ProfessionalName, &pp.Appointments, &pp.TotalBilled) == nil {
				summary.ProductionByProfessional = append(summary.ProductionByProfessional, pp)
			}
		}
		rows.Close()
	}

	// 5. Nuevos pacientes
	_ = s.db.QueryRow(`SELECT COUNT(id) FROM patients WHERE substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) <= ?`, from, to).Scan(&summary.NewPatientsCount)

	writeJSON(w, 200, summary)
}
