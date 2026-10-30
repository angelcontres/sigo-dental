package main

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	_ "github.com/lib/pq"
	_ "modernc.org/sqlite"
)

const schema = `
CREATE TABLE IF NOT EXISTS sedes (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	address TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS professionals (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	specialty TEXT NOT NULL DEFAULT '',
	color TEXT NOT NULL DEFAULT '#0f6e6e'
);

CREATE TABLE IF NOT EXISTS chairs (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	sede_id TEXT NOT NULL REFERENCES sedes(id)
);

CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL CHECK (role IN ('admin','odontologo','recepcion')),
	active BOOLEAN NOT NULL DEFAULT true,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patients (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	doc TEXT NOT NULL UNIQUE,
	birth TEXT NOT NULL DEFAULT '',
	phone TEXT NOT NULL DEFAULT '',
	email TEXT NOT NULL DEFAULT '',
	address TEXT NOT NULL DEFAULT '',
	sede_id TEXT NOT NULL REFERENCES sedes(id),
	allergies TEXT NOT NULL DEFAULT '',
	notes TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_patients_doc ON patients(doc);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_sede ON patients(sede_id);

CREATE TABLE IF NOT EXISTS appointments (
	id TEXT PRIMARY KEY,
	patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
	professional_id TEXT NOT NULL REFERENCES professionals(id),
	chair_id TEXT NOT NULL REFERENCES chairs(id),
	date TEXT NOT NULL,
	time TEXT NOT NULL,
	reason TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'PROGRAMADA',
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE TABLE IF NOT EXISTS findings (
	patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
	tooth TEXT NOT NULL,
	condition TEXT NOT NULL,
	surfaces TEXT NOT NULL DEFAULT '',
	note TEXT NOT NULL DEFAULT '',
	updated_at TEXT NOT NULL,
	PRIMARY KEY (patient_id, tooth)
);
CREATE INDEX IF NOT EXISTS idx_findings_patient ON findings(patient_id);

CREATE TABLE IF NOT EXISTS periodontal_exams (
	id TEXT PRIMARY KEY,
	patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
	exam_date TEXT NOT NULL,
	created_by TEXT NOT NULL,
	created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_periodontal_exams_patient ON periodontal_exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_periodontal_exams_date ON periodontal_exams(exam_date);

CREATE TABLE IF NOT EXISTS periodontal_measurements (
	id TEXT PRIMARY KEY,
	exam_id TEXT NOT NULL REFERENCES periodontal_exams(id) ON DELETE CASCADE,
	tooth TEXT NOT NULL,
	site TEXT NOT NULL,
	depth INTEGER NOT NULL,
	bleeding BOOLEAN NOT NULL DEFAULT false,
	calculus BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS soep_notes (
	id TEXT PRIMARY KEY,
	patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
	subjective TEXT NOT NULL,
	objective TEXT NOT NULL,
	evaluation TEXT NOT NULL,
	plan TEXT NOT NULL,
	created_by TEXT NOT NULL,
	created_at TEXT NOT NULL,
	locked BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_soep_notes_patient ON soep_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_soep_notes_created_at ON soep_notes(created_at);

CREATE TABLE IF NOT EXISTS treatment_budgets (
	id TEXT PRIMARY KEY,
	patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
	total_amount REAL NOT NULL,
	status TEXT NOT NULL DEFAULT 'PENDIENTE',
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS treatment_items (
	id TEXT PRIMARY KEY,
	budget_id TEXT NOT NULL REFERENCES treatment_budgets(id) ON DELETE CASCADE,
	description TEXT NOT NULL,
	amount REAL NOT NULL,
	phase TEXT NOT NULL,
	approved BOOLEAN NOT NULL DEFAULT false,
	converted BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS inventory_items (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	category TEXT NOT NULL,
	stock INTEGER NOT NULL DEFAULT 0,
	min_stock INTEGER NOT NULL DEFAULT 5,
	unit TEXT NOT NULL DEFAULT 'unidad'
);

CREATE TABLE IF NOT EXISTS inventory_movements (
	id TEXT PRIMARY KEY,
	item_id TEXT NOT NULL REFERENCES inventory_items(id),
	quantity INTEGER NOT NULL,
	type TEXT NOT NULL,
	reason TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
	id TEXT PRIMARY KEY,
	patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
	concept TEXT NOT NULL,
	amount REAL NOT NULL,
	method TEXT NOT NULL,
	date TEXT NOT NULL,
	time TEXT NOT NULL,
	closure_id TEXT NOT NULL DEFAULT '',
	created_by TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_closure ON payments(closure_id);

CREATE TABLE IF NOT EXISTS closures (
	id TEXT PRIMARY KEY,
	date TEXT NOT NULL,
	total REAL NOT NULL,
	count INTEGER NOT NULL,
	closed_at TEXT NOT NULL,
	closed_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit (
	id SERIAL PRIMARY KEY,
	at TEXT NOT NULL,
	user_id TEXT NOT NULL DEFAULT '',
	user_name TEXT NOT NULL DEFAULT '',
	action TEXT NOT NULL,
	entity TEXT NOT NULL,
	entity_id TEXT NOT NULL DEFAULT '',
	detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit(at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit(entity);

CREATE TABLE IF NOT EXISTS consents (
	id TEXT PRIMARY KEY,
	patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
	procedure TEXT NOT NULL,
	content TEXT NOT NULL,
	signed_at TEXT NOT NULL,
	signed_by TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commissions (
	id TEXT PRIMARY KEY,
	professional_id TEXT NOT NULL REFERENCES professionals(id),
	amount REAL NOT NULL,
	payment_id TEXT NOT NULL REFERENCES payments(id),
	date TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_totp (
	user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	secret TEXT NOT NULL,
	enabled BOOLEAN NOT NULL DEFAULT false,
	backup_codes TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
	id TEXT PRIMARY KEY,
	patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
	type TEXT NOT NULL,
	channel TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'pending',
	message TEXT NOT NULL,
	scheduled_at TEXT NOT NULL,
	sent_at TEXT,
	created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_patient ON notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_at);

CREATE TABLE IF NOT EXISTS notification_templates (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	type TEXT NOT NULL,
	channel TEXT NOT NULL,
	subject TEXT NOT NULL,
	body TEXT NOT NULL,
	variables TEXT NOT NULL,
	active BOOLEAN NOT NULL DEFAULT true,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
	id TEXT PRIMARY KEY,
	patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
	payment_id TEXT NOT NULL REFERENCES payments(id),
	number TEXT NOT NULL,
	amount REAL NOT NULL,
	tax REAL NOT NULL DEFAULT 0,
	total REAL NOT NULL,
	cae TEXT NOT NULL DEFAULT '',
	cae_due TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'draft',
	created_at TEXT NOT NULL,
	issued_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment ON invoices(payment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE TABLE IF NOT EXISTS patient_attachments (
	id TEXT PRIMARY KEY,
	patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
	type TEXT NOT NULL,
	file_name TEXT NOT NULL,
	file_url TEXT NOT NULL,
	file_size INTEGER NOT NULL,
	notes TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL,
	created_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_patient_attachments_patient ON patient_attachments(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_attachments_type ON patient_attachments(type);
`

func openDB(connStr string) (*sql.DB, error) {
	var db *sql.DB
	var err error

	// Detectar si es una cadena de conexión PostgreSQL
	if strings.Contains(connStr, "postgres://") || strings.Contains(connStr, "@") {
		// PostgreSQL
		db, err = sql.Open("postgres", connStr)
		if err != nil {
			return nil, err
		}
		db.SetMaxOpenConns(25)
		db.SetMaxIdleConns(5)
	} else {
		// SQLite
		if err := os.MkdirAll(filepath.Dir(connStr), 0o755); err != nil {
			return nil, err
		}
		dsn := "file:" + filepath.ToSlash(connStr) + "?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)"
		db, err = sql.Open("sqlite", dsn)
		if err != nil {
			return nil, err
		}
		db.SetMaxOpenConns(1)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

func seed(db *sql.DB) error {
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	log.Println("base vacía: cargando datos de demostración extensivos")

	todayDate := time.Now().Format("2006-01-02")
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	tomorrow := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	nextWeek := time.Now().AddDate(0, 0, 7).Format("2006-01-02")

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Sedes
	stmts := []string{
		`INSERT INTO sedes (id, name, address) VALUES
			('s1','Sede Central','Av. Corrientes 1234, CABA'),
			('s2','Sede Norte','Av. Maipú 567, Vicente López'),
			('s3','Sede Oeste','Av. Libertador 890, San Martín')`,
		
		// Profesionales
		`INSERT INTO professionals (id, name, specialty, color) VALUES
			('pr1','Dra. María Gómez','Ortodoncia','#0f6e6e'),
			('pr2','Dr. Juan Pérez','Clínica general','#1e88e5'),
			('pr3','Dra. Laura Ruiz','Endodoncia','#6a1b9a'),
			('pr4','Dr. Carlos Sánchez','Periodoncia','#00897b'),
			('pr5','Dra. Ana López','Odontopediatría','#fb8c00')`,
		
		// Sillones
		`INSERT INTO chairs (id, name, sede_id) VALUES
			('c1','Sillón 1','s1'),
			('c2','Sillón 2','s1'),
			('c3','Sillón 3','s1'),
			('c4','Sillón 4','s1'),
			('c5','Sillón 1','s2'),
			('c6','Sillón 2','s2'),
			('c7','Sillón 1','s3'),
			('c8','Sillón 2','s3')`,
	}

	for _, stmt := range stmts {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Usuarios (usando placeholders estándar)
	users := []struct {
		id, name, email, password, role string
	}{
		{"u1", "Administración", "admin@sigo.local", "admin123", "admin"},
		{"u2", "Dra. María Gómez", "gomez@sigo.local", "odonto123", "odontologo"},
		{"u3", "Dr. Juan Pérez", "perez@sigo.local", "odonto123", "odontologo"},
		{"u4", "Dra. Laura Ruiz", "ruiz@sigo.local", "odonto123", "odontologo"},
		{"u5", "Recepción Central", "recepcion@sigo.local", "recepcion123", "recepcion"},
	}
	for _, u := range users {
		hash, err := bcrypt.GenerateFromPassword([]byte(u.password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(`INSERT INTO users (id, name, email, password_hash, role, active, created_at) VALUES (?,?,?,?,?,true,?)`,
			u.id, u.name, u.email, string(hash), u.role, nowISO()); err != nil {
			log.Printf("Error insertando usuario %s con rol %s: %v", u.email, u.role, err)
			return err
		}
	}

	// Pacientes extensivos
	patients := []string{
		`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at) VALUES
			('p1','María González','30123456','1984-03-15','+54 9 11 2345-6789','maria.gonzalez@mail.com','Thames 1234, CABA','s1','Penicilina (severa)','Ansiedad dental. Prefiere turnos por la mañana. Paciente regular desde 2020.','` + nowISO() + `')`,
		`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at) VALUES
			('p2','Juan Pérez','28456789','1976-07-22','+54 9 11 3456-7890','juan.perez@mail.com','Gorriti 890, CABA','s1','Ninguna','Derivado para evaluación de implante. Tratamiento en curso.','` + nowISO() + `')`,
		`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at) VALUES
			('p3','Lucía Fernández','41234567','1999-11-03','+54 9 11 4567-8901','lucia.fernandez@mail.com','Cabildo 2200, CABA','s1','Látex (leve)','Estudiante universitaria. Primera consulta.','` + nowISO() + `')`,
		`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at) VALUES
			('p4','Carlos Rodríguez','25678901','1968-01-30','+54 9 11 5678-9012','carlos.rodriguez@mail.com','Libertador 4500, CABA','s1','Ninguna','Control de prótesis. Usuario desde 2015.','` + nowISO() + `')`,
		`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at) VALUES
			('p5','Sofía Martínez','38901234','1990-05-18','+54 9 11 6789-0123','sofia.martinez@mail.com','Mitre 780, Vicente López','s2','Ibuprofeno','Paciente de la sede norte. Tratamiento de ortodoncia.','` + nowISO() + `')`,
		`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at) VALUES
			('p6','Roberto Silva','23456789','1972-09-10','+54 9 11 7890-1234','roberto.silva@mail.com','San Martín 450, Vicente López','s2','Ninguna','Paciente nuevo. Evaluación general.','` + nowISO() + `')`,
		`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at) VALUES
			('p7','Ana Ramírez','40123456','1988-12-25','+54 9 11 8901-2345','ana.ramirez@mail.com','Belgrano 340, CABA','s1','Aspirina','Frecuente en controles de rutina.','` + nowISO() + `')`,
		`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at) VALUES
			('p8','Pedro González','27890123','1965-04-05','+54 9 11 9012-3456','pedro.gonzalez@mail.com','Rivadavia 1200, CABA','s1','Ninguna','Paciente adulto mayor. Prótesis completa.','` + nowISO() + `')`,
		`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at) VALUES
			('p9','Valentina Castro','35678901','2005-08-15','+54 9 11 2345-6789','valentina.castro@mail.com','Las Heras 670, CABA','s1','Ninguna','Paciente odontopediátrico. Menor de edad.','` + nowISO() + `')`,
		`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at) VALUES
			('p10','Diego López','29012345','1982-11-20','+54 9 11 3456-7890','diego.lopez@mail.com','Pueyrredón 890, CABA','s1','Amoxicilina','Urgencia por dolor intenso.','` + nowISO() + `')`,
		`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at) VALUES
			('p11','Camila Torres','42345678','1995-02-28','+54 9 11 4567-8901','camila.torres@mail.com','Argentina 450, Vicente López','s2','Ninguna','Estética: blanqueamiento solicitado.','` + nowISO() + `')`,
		`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at) VALUES
			('p12','Fernando Mendoza','26789012','1970-06-12','+54 9 11 5678-9012','fernando.mendoza@mail.com','Moreno 230, San Martín','s3','Penicilina (moderada)','Paciente de la sede oeste. Implantes.','` + nowISO() + `')`,
		`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at) VALUES
			('p13','Laura Benítez','38456789','1987-10-08','+54 9 11 6789-0123','laura.benitez@mail.com','Urquiza 560, San Martín','s3','Ninguna','Tratamiento de conducto en progreso.','` + nowISO() + `')`,
		`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at) VALUES
			('p14','Mateo Ramos','39234567','2008-03-22','+54 9 11 7890-1234','mateo.ramos@mail.com','Sarmiento 890, CABA','s1','Ninguna','Paciente odontopediátrico. Control de caries.','` + nowISO() + `')`,
		`INSERT INTO patients (id, name, doc, birth, phone, email, address, sede_id, allergies, notes, created_at) VALUES
			('p15','Isabella Flores','41567890','2006-07-14','+54 9 11 8901-2345','isabella.flores@mail.com','Belgrano 1200, CABA','s1','Ninguna','Paciente adolescente. Ortodoncia.','` + nowISO() + `')`,
	}
	for _, stmt := range patients {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Turnos extensivos (varios días y estados)
	appointments := []string{
		// Hoy
		`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at) VALUES
			('a1','p1','pr1','c1','` + todayDate + `','09:00','Control ortodoncia','CONFIRMADA','` + nowISO() + `','` + nowISO() + `')`,
		`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at) VALUES
			('a2','p2','pr2','c2','` + todayDate + `','10:00','Limpieza profunda','PROGRAMADA','` + nowISO() + `','` + nowISO() + `')`,
		`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at) VALUES
			('a3','p3','pr3','c3','` + todayDate + `','11:30','Dolor agudo','EN_SALA','` + nowISO() + `','` + nowISO() + `')`,
		`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at) VALUES
			('a4','p4','pr1','c1','` + todayDate + `','15:00','Control prótesis','ATENDIDA','` + nowISO() + `','` + nowISO() + `')`,
		`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at) VALUES
			('a5','p9','pr5','c4','` + todayDate + `','16:00','Control odontopediatría','PROGRAMADA','` + nowISO() + `','` + nowISO() + `')`,
		// Ayer
		`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at) VALUES
			('a6','p7','pr2','c2','` + yesterday + `','09:00','Limpieza','ATENDIDA','` + nowISO() + `','` + nowISO() + `')`,
		`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at) VALUES
			('a7','p10','pr3','c3','` + yesterday + `','14:00','Tratamiento conducto','ATENDIDA','` + nowISO() + `','` + nowISO() + `')`,
		`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at) VALUES
			('a8','p1','pr1','c1','` + yesterday + `','10:00','Ajuste brackets','CANCELADA','` + nowISO() + `','` + nowISO() + `')`,
		// Mañana
		`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at) VALUES
			('a9','p5','pr2','c5','` + tomorrow + `','09:30','Control general','PROGRAMADA','` + nowISO() + `','` + nowISO() + `')`,
		`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at) VALUES
			('a10','p6','pr4','c6','` + tomorrow + `','11:00','Evaluación periodontal','PROGRAMADA','` + nowISO() + `','` + nowISO() + `')`,
		`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at) VALUES
			('a11','p12','pr2','c7','` + tomorrow + `','15:00','Implante','PROGRAMADA','` + nowISO() + `','` + nowISO() + `')`,
		`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at) VALUES
			('a12','p13','pr3','c8','` + tomorrow + `','16:30','Control conducto','PROGRAMADA','` + nowISO() + `','` + nowISO() + `')`,
		// Próxima semana
		`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at) VALUES
			('a13','p14','pr5','c4','` + nextWeek + `','10:00','Control caries','PROGRAMADA','` + nowISO() + `','` + nowISO() + `')`,
		`INSERT INTO appointments (id, patient_id, professional_id, chair_id, date, time, reason, status, created_at, updated_at) VALUES
			('a14','p15','pr1','c1','` + nextWeek + `','11:30','Ajuste ortodoncia','PROGRAMADA','` + nowISO() + `','` + nowISO() + `')`,
	}
	for _, stmt := range appointments {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Hallazgos en odontograma para varios pacientes
	findings := []string{
		`INSERT INTO findings (patient_id, tooth, condition, surfaces, note, updated_at) VALUES ('p1','36','caries','O','Caries oclusal profunda','` + nowISO() + `')`,
		`INSERT INTO findings (patient_id, tooth, condition, surfaces, note, updated_at) VALUES ('p1','46','restauracion','O,V','Restauración de resina existente','` + nowISO() + `')`,
		`INSERT INTO findings (patient_id, tooth, condition, surfaces, note, updated_at) VALUES ('p1','11','sellante','O','Sellante preventivo','` + nowISO() + `')`,
		`INSERT INTO findings (patient_id, tooth, condition, surfaces, note, updated_at) VALUES ('p2','16','ausente','O','Extracción previa, candidato a implante','` + nowISO() + `')`,
		`INSERT INTO findings (patient_id, tooth, condition, surfaces, note, updated_at) VALUES ('p2','26','corona','O','Corona metal-cerámica','` + nowISO() + `')`,
		`INSERT INTO findings (patient_id, tooth, condition, surfaces, note, updated_at) VALUES ('p3','14','caries','M,D','Caries interproximal','` + nowISO() + `')`,
		`INSERT INTO findings (patient_id, tooth, condition, surfaces, note, updated_at) VALUES ('p3','24','caries','D','Caries incipiente','` + nowISO() + `')`,
		`INSERT INTO findings (patient_id, tooth, condition, surfaces, note, updated_at) VALUES ('p4','11','implante','O','Implante osteointegrado','` + nowISO() + `')`,
		`INSERT INTO findings (patient_id, tooth, condition, surfaces, note, updated_at) VALUES ('p4','21','implante','O','Implante osteointegrado','` + nowISO() + `')`,
		`INSERT INTO findings (patient_id, tooth, condition, surfaces, note, updated_at) VALUES ('p5','36','endodoncia','O','Tratamiento de conducto completado','` + nowISO() + `')`,
		`INSERT INTO findings (patient_id, tooth, condition, surfaces, note, updated_at) VALUES ('p10','36','fractura','O','Fractura vertical, evaluación de extracción','` + nowISO() + `')`,
		`INSERT INTO findings (patient_id, tooth, condition, surfaces, note, updated_at) VALUES ('p14','84','caries','O','Caries oclusal en primer molar temporal','` + nowISO() + `')`,
		`INSERT INTO findings (patient_id, tooth, condition, surfaces, note, updated_at) VALUES ('p14','74','sellante','O','Sellante preventivo','` + nowISO() + `')`,
	}
	for _, stmt := range findings {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Pagos
	payments := []string{
		`INSERT INTO payments (id, patient_id, concept, amount, method, date, time, closure_id, created_by) VALUES
			('pay1','p4','Consulta de control',15000,'Efectivo','` + yesterday + `','08:45','','Sistema')`,
		`INSERT INTO payments (id, patient_id, concept, amount, method, date, time, closure_id, created_by) VALUES
			('pay2','p7','Limpieza profunda',25000,'Tarjeta','` + yesterday + `','10:30','','Recepción Central')`,
		`INSERT INTO payments (id, patient_id, concept, amount, method, date, time, closure_id, created_by) VALUES
			('pay3','p10','Tratamiento conducto',45000,'Transferencia','` + yesterday + `','14:45','','Recepción Central')`,
		`INSERT INTO payments (id, patient_id, concept, amount, method, date, time, closure_id, created_by) VALUES
			('pay4','p1','Control ortodoncia',20000,'Efectivo','` + todayDate + `','09:15','','Recepción Central')`,
		`INSERT INTO payments (id, patient_id, concept, amount, method, date, time, closure_id, created_by) VALUES
			('pay5','p5','Cuota tratamiento',30000,'Tarjeta','` + todayDate + `','11:00','','Recepción Norte')`,
	}
	for _, stmt := range payments {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Exámenes periodontales
	periodontalExams := []string{
		`INSERT INTO periodontal_exams (id, patient_id, exam_date, created_by, created_at) VALUES
			('pe1','p6','` + todayDate + `','Dr. Carlos Sánchez','` + nowISO() + `')`,
		`INSERT INTO periodontal_exams (id, patient_id, exam_date, created_by, created_at) VALUES
			('pe2','p5','` + yesterday + `','Dr. Carlos Sánchez','` + nowISO() + `')`,
	}
	for _, stmt := range periodontalExams {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Mediciones periodontales
	periodontalMeasurements := []string{
		`INSERT INTO periodontal_measurements (id, exam_id, tooth, site, depth, bleeding, calculus) VALUES
			('pm1','pe1','16','MB',2,true,false)`,
		`INSERT INTO periodontal_measurements (id, exam_id, tooth, site, depth, bleeding, calculus) VALUES
			('pm2','pe1','16','B',3,true,true)`,
		`INSERT INTO periodontal_measurements (id, exam_id, tooth, site, depth, bleeding, calculus) VALUES
			('pm3','pe1','16','DB',2,false,false)`,
		`INSERT INTO periodontal_measurements (id, exam_id, tooth, site, depth, bleeding, calculus) VALUES
			('pm4','pe1','16','D',1,false,false)`,
		`INSERT INTO periodontal_measurements (id, exam_id, tooth, site, depth, bleeding, calculus) VALUES
			('pm5','pe1','26','MB',3,true,true)`,
		`INSERT INTO periodontal_measurements (id, exam_id, tooth, site, depth, bleeding, calculus) VALUES
			('pm6','pe1','26','B',4,true,true)`,
		`INSERT INTO periodontal_measurements (id, exam_id, tooth, site, depth, bleeding, calculus) VALUES
			('pm7','pe1','36','MB',2,false,false)`,
		`INSERT INTO periodontal_measurements (id, exam_id, tooth, site, depth, bleeding, calculus) VALUES
			('pm8','pe1','36','B',3,true,false)`,
	}
	for _, stmt := range periodontalMeasurements {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Notas SOEP
	soepNotes := []string{
		`INSERT INTO soep_notes (id, patient_id, subjective, objective, evaluation, plan, created_by, created_at, locked) VALUES
			('sn1','p3','Paciente refiere dolor en zona molar derecha. Dolor moderado, continua.','Caries detectada en 14-D y 24-D. Sensibilidad a frío.','Caries interproximal activa. Tratamiento conservador recomendado.','Restauración en 14 y 24. Control en 6 meses.','Dra. Laura Ruiz','` + nowISO() + `',false)`,
		`INSERT INTO soep_notes (id, patient_id, subjective, objective, evaluation, plan, created_by, created_at, locked) VALUES
			('sn2','p10','Dolor intenso en 36. Irradiación a zona oído. Febril desde ayer.','Fractura vertical en 36. Inflamación perirradicular. Movilidad grado 1.','Fractura vertical compleja. Pronóstico reservado.','Extracción de 36. Evaluación de reemplazo con implante.','Dr. Juan Pérez','` + nowISO() + `',false)`,
		`INSERT INTO soep_notes (id, patient_id, subjective, objective, evaluation, plan, created_by, created_at, locked) VALUES
			('sn3','p14','Madre refiere que el niño come mucho dulce. No cepilla los dientes regularmente.','Caries oclusal en 84. Placa abundante. Gingivitis leve.','Caries activa. Higiene deficiente.','Restauración en 84. Educación en higiene. Aplicación de flúor.','Dra. Ana López','` + nowISO() + `',false)`,
	}
	for _, stmt := range soepNotes {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Consentimientos
	consents := []string{
		`INSERT INTO consents (id, patient_id, procedure, content, signed_at, signed_by, created_at) VALUES
			('c1','p10','Extracción dental','Consentimiento informado para extracción del diente 36 debido a fractura vertical. Se explicaron riesgos y alternativas.','` + yesterday + `','Paciente','` + nowISO() + `')`,
		`INSERT INTO consents (id, patient_id, procedure, content, signed_at, signed_by, created_at) VALUES
			('c2','p12','Implante dental','Consentimiento informado para colocación de implante en zona 16. Se explicaron riesgos, tiempo de recuperación y cuidados postoperatorios.','` + nowISO() + `','Paciente','` + nowISO() + `')`,
		`INSERT INTO consents (id, patient_id, procedure, content, signed_at, signed_by, created_at) VALUES
			('c3','p14','Restauración con sedación','Consentimiento informado para restauración dental con sedación consciente. Tutor legal presente y firma consentimiento.','` + nowISO() + `','Tutor legal','` + nowISO() + `')`,
	}
	for _, stmt := range consents {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Presupuestos de tratamiento
	treatmentBudgets := []string{
		`INSERT INTO treatment_budgets (id, patient_id, total_amount, status, created_at, updated_at) VALUES
			('tb1','p12',250000,'APROBADO','` + nowISO() + `','` + nowISO() + `')`,
		`INSERT INTO treatment_budgets (id, patient_id, total_amount, status, created_at, updated_at) VALUES
			('tb2','p5',180000,'PENDIENTE','` + nowISO() + `','` + nowISO() + `')`,
		`INSERT INTO treatment_budgets (id, patient_id, total_amount, status, created_at, updated_at) VALUES
			('tb3','p15',350000,'EN_PROGRESO','` + nowISO() + `','` + nowISO() + `')`,
	}
	for _, stmt := range treatmentBudgets {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Ítems de tratamiento
	treatmentItems := []string{
		`INSERT INTO treatment_items (id, budget_id, description, amount, phase, approved, converted) VALUES
			('ti1','tb1','Implante dental + corona',150000,'Fase 1',true,false)`,
		`INSERT INTO treatment_items (id, budget_id, description, amount, phase, approved, converted) VALUES
			('ti2','tb1','Injerto óseo',50000,'Fase 1',true,false)`,
		`INSERT INTO treatment_items (id, budget_id, description, amount, phase, approved, converted) VALUES
			('ti3','tb1','Prótesis temporal',50000,'Fase 2',true,false)`,
		`INSERT INTO treatment_items (id, budget_id, description, amount, phase, approved, converted) VALUES
			('ti4','tb2','Blanqueamiento',60000,'Fase 1',false,false)`,
		`INSERT INTO treatment_items (id, budget_id, description, amount, phase, approved, converted) VALUES
			('ti5','tb2','Limpieza profunda',40000,'Fase 1',true,false)`,
		`INSERT INTO treatment_items (id, budget_id, description, amount, phase, approved, converted) VALUES
			('ti6','tb2','Sellantes',20000,'Fase 1',true,false)`,
		`INSERT INTO treatment_items (id, budget_id, description, amount, phase, approved, converted) VALUES
			('ti7','tb3','Brackets superior',120000,'Fase 1',true,true)`,
		`INSERT INTO treatment_items (id, budget_id, description, amount, phase, approved, converted) VALUES
			('ti8','tb3','Brackets inferior',120000,'Fase 1',true,true)`,
		`INSERT INTO treatment_items (id, budget_id, description, amount, phase, approved, converted) VALUES
			('ti9','tb3','Retainers',50000,'Fase 3',false,false)`,
		`INSERT INTO treatment_items (id, budget_id, description, amount, phase, approved, converted) VALUES
			('ti10','tb3','Ajustes mensuales',60000,'Fase 2',true,false)`,
	}
	for _, stmt := range treatmentItems {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Inventario
	inventoryItems := []string{
		`INSERT INTO inventory_items (id, name, category, stock, min_stock, unit) VALUES
			('ii1','Resina compuesta','Material',150,50,'unidades')`,
		`INSERT INTO inventory_items (id, name, category, stock, min_stock, unit) VALUES
			('ii2','Amalgama','Material',80,30,'unidades')`,
		`INSERT INTO inventory_items (id, name, category, stock, min_stock, unit) VALUES
			('ii3','Anestesia lidocaína','Medicamento',200,50,'unidades')`,
		`INSERT INTO inventory_items (id, name, category, stock, min_stock, unit) VALUES
			('ii4','Guantes latex','Material',500,100,'cajas')`,
		`INSERT INTO inventory_items (id, name, category, stock, min_stock, unit) VALUES
			('ii5','Mascarillas','Material',300,50,'cajas')`,
		`INSERT INTO inventory_items (id, name, category, stock, min_stock, unit) VALUES
			('ii6','Brocas','Instrumental',100,30,'unidades')`,
		`INSERT INTO inventory_items (id, name, category, stock, min_stock, unit) VALUES
			('ii7','Fresas','Instrumental',80,25,'unidades')`,
		`INSERT INTO inventory_items (id, name, category, stock, min_stock, unit) VALUES
			('ii8','Algodón','Material',50,20,'paquetes')`,
		`INSERT INTO inventory_items (id, name, category, stock, min_stock, unit) VALUES
			('ii9','Gasas','Material',100,30,'paquetes')`,
		`INSERT INTO inventory_items (id, name, category, stock, min_stock, unit) VALUES
			('ii10','Papel de artro','Material',60,20,'rollos')`,
	}
	for _, stmt := range inventoryItems {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Movimientos de inventario
	inventoryMovements := []string{
		`INSERT INTO inventory_movements (id, item_id, quantity, type, reason, created_at) VALUES
			('im1','ii1',20,'ENTRADA','Reposición mensual','` + nowISO() + `')`,
		`INSERT INTO inventory_movements (id, item_id, quantity, type, reason, created_at) VALUES
			('im2','ii3',50,'ENTRADA','Reposición mensual','` + nowISO() + `')`,
		`INSERT INTO inventory_movements (id, item_id, quantity, type, reason, created_at) VALUES
			('im3','ii1',5,'SALIDA','Uso diario','` + yesterday + `')`,
		`INSERT INTO inventory_movements (id, item_id, quantity, type, reason, created_at) VALUES
			('im4','ii4',2,'SALIDA','Uso diario','` + yesterday + `')`,
		`INSERT INTO inventory_movements (id, item_id, quantity, type, reason, created_at) VALUES
			('im5','ii6',3,'SALIDA','Rotura','` + yesterday + `')`,
	}
	for _, stmt := range inventoryMovements {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Comisiones
	commissions := []string{
		`INSERT INTO commissions (id, professional_id, amount, payment_id, date, created_at) VALUES
			('com1','pr1',3000,'pay1','` + yesterday + `','` + nowISO() + `')`,
		`INSERT INTO commissions (id, professional_id, amount, payment_id, date, created_at) VALUES
			('com2','pr2',5000,'pay2','` + yesterday + `','` + nowISO() + `')`,
		`INSERT INTO commissions (id, professional_id, amount, payment_id, date, created_at) VALUES
			('com3','pr3',9000,'pay3','` + yesterday + `','` + nowISO() + `')`,
		`INSERT INTO commissions (id, professional_id, amount, payment_id, date, created_at) VALUES
			('com4','pr1',4000,'pay4','` + todayDate + `','` + nowISO() + `')`,
		`INSERT INTO commissions (id, professional_id, amount, payment_id, date, created_at) VALUES
			('com5','pr2',6000,'pay5','` + todayDate + `','` + nowISO() + `')`,
	}
	for _, stmt := range commissions {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Notificaciones
	notifications := []string{
		`INSERT INTO notifications (id, patient_id, type, channel, status, message, scheduled_at, created_at) VALUES
			('n1','p1','reminder','whatsapp','sent','Recordatorio de turno mañana a las 09:00','` + todayDate + `','` + nowISO() + `')`,
		`INSERT INTO notifications (id, patient_id, type, channel, status, message, scheduled_at, created_at) VALUES
			('n2','p2','reminder','whatsapp','sent','Recordatorio de turno mañana a las 10:00','` + todayDate + `','` + nowISO() + `')`,
		`INSERT INTO notifications (id, patient_id, type, channel, status, message, scheduled_at, created_at) VALUES
			('n3','p5','reminder','sms','pending','Recordatorio de turno mañana a las 09:30','` + todayDate + `','` + nowISO() + `')`,
		`INSERT INTO notifications (id, patient_id, type, channel, status, message, scheduled_at, created_at) VALUES
			('n4','p6','confirmation','email','sent','Confirmación de cita de evaluación periodontal','` + todayDate + `','` + nowISO() + `')`,
	}
	for _, stmt := range notifications {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Facturas
	invoices := []string{
		`INSERT INTO invoices (id, patient_id, payment_id, number, amount, tax, total, cae, cae_due, status, created_at, issued_at) VALUES
			('inv1','p4','pay1','F-001',15000,3150,18150,'CAE-123456','2025-01-01','issued','` + yesterday + `','` + yesterday + `')`,
		`INSERT INTO invoices (id, patient_id, payment_id, number, amount, tax, total, cae, cae_due, status, created_at, issued_at) VALUES
			('inv2','p7','pay2','F-002',25000,5250,30250,'CAE-123457','2025-01-01','issued','` + yesterday + `','` + yesterday + `')`,
		`INSERT INTO invoices (id, patient_id, payment_id, number, amount, tax, total, cae, cae_due, status, created_at, issued_at) VALUES
			('inv3','p10','pay3','F-003',45000,9450,54450,'CAE-123458','2025-01-01','issued','` + yesterday + `','` + yesterday + `')`,
		`INSERT INTO invoices (id, patient_id, payment_id, number, amount, tax, total, cae, cae_due, status, created_at, issued_at) VALUES
			('inv4','p1','pay4','F-004',20000,4200,24200,'PENDIENTE','PENDIENTE','draft','` + todayDate + `','')`,
	}
	for _, stmt := range invoices {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	// Adjuntos de pacientes
	patientAttachments := []string{
		`INSERT INTO patient_attachments (id, patient_id, type, file_name, file_url, file_size, notes, created_at, created_by) VALUES
			('pa1','p4','radiograph','rx_14_21_2024.jpg','https://storage.sigo.dental/rx/p4_2024.jpg',1024000,'Radiografía panorámica previa','` + nowISO() + `','Sistema')`,
		`INSERT INTO patient_attachments (id, patient_id, type, file_name, file_url, file_size, notes, created_at, created_by) VALUES
			('pa2','p12','document','consentimiento_implante.pdf','https://storage.sigo.dental/docs/p12_consent.pdf',51200,'Consentimiento firmado','` + nowISO() + `','Sistema')`,
		`INSERT INTO patient_attachments (id, patient_id, type, file_name, file_url, file_size, notes, created_at, created_by) VALUES
			('pa3','p14','photo','foto_intraoral_84.jpg','https://storage.sigo.dental/photos/p14_84.jpg',2048000,'Foto pre-tratamiento','` + nowISO() + `','Dra. Ana López')`,
	}
	for _, stmt := range patientAttachments {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	log.Println("datos de demostración cargados exitosamente")
	return nil
}
