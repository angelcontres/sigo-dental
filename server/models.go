package main

import "time"

type User struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	Active    bool   `json:"active"`
	CreatedAt string `json:"createdAt"`
}

type Patient struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Doc       string `json:"doc"`
	Birth     string `json:"birth"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	Address   string `json:"address"`
	SedeID    string `json:"sedeId"`
	Allergies string `json:"allergies"`
	Notes     string `json:"notes"`
	CreatedAt string `json:"createdAt"`
}

type Professional struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Specialty string `json:"specialty"`
	Color     string `json:"color"`
}

type Chair struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	SedeID string `json:"sedeId"`
}

type Sede struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Address string `json:"address"`
}

type Appointment struct {
	ID               string `json:"id"`
	PatientID        string `json:"patientId"`
	PatientName      string `json:"patientName"`
	PatientAllergies string `json:"patientAllergies"`
	ProfessionalID   string `json:"professionalId"`
	ProfessionalName string `json:"professionalName"`
	ChairID          string `json:"chairId"`
	ChairName        string `json:"chairName"`
	Date             string `json:"date"`
	Time             string `json:"time"`
	Reason           string `json:"reason"`
	Status           string `json:"status"`
	CreatedAt        string `json:"createdAt"`
}

type Finding struct {
	Tooth     string   `json:"tooth"`
	Condition string   `json:"condition"`
	Surfaces  []string `json:"surfaces"`
	Note      string `json:"note"`
	UpdatedAt string `json:"updatedAt"`
	Radiograph string `json:"radiograph"` // URL de radiografía
}

type Payment struct {
	ID        string  `json:"id"`
	PatientID string  `json:"patientId"`
	Patient   string `json:"patientName"`
	Concept   string `json:"concept"`
	Amount    float64 `json:"amount"`
	Method    string `json:"method"`
	Date      string `json:"date"`
	Time      string `json:"time"`
	ClosureID string `json:"closureId"`
	CreatedBy string `json:"createdBy"`
}

type Closure struct {
	ID       string  `json:"id"`
	Date     string `json:"date"`
	Total    float64 `json:"total"`
	Count    int     `json:"count"`
	ClosedAt string `json:"closedAt"`
	ClosedBy string `json:"closedBy"`
}

type AuditEntry struct {
	ID       int64  `json:"id"`
	At       string `json:"at"`
	UserID   string `json:"userId"`
	UserName string `json:"userName"`
	Action   string `json:"action"`
	Entity   string `json:"entity"`
	EntityID string `json:"entityId"`
	Detail   string `json:"detail"`
}

type Dashboard struct {
	Date             string        `json:"date"`
	Patients         int           `json:"patients"`
	Appointments     int           `json:"appointments"`
	Pending          int           `json:"pending"`
	Collected        float64       `json:"collected"`
	AlertCount       int           `json:"alertCount"`
	Alerts           []Patient     `json:"alerts"`
	TodayAppts       []Appointment `json:"todayAppointments"`
	RecentPayments   []Payment     `json:"recentPayments"`
	Upcoming         []Appointment `json:"upcoming"`
	OpenCashPayments int           `json:"openCashPayments"`
	OpenCashTotal    float64       `json:"openCashTotal"`
}

var fdiTeeth = map[string]bool{
	"18": true, "17": true, "16": true, "15": true, "14": true, "13": true, "12": true, "11": true,
	"21": true, "22": true, "23": true, "24": true, "25": true, "26": true, "27": true, "28": true,
	"48": true, "47": true, "46": true, "45": true, "44": true, "43": true, "42": true, "41": true,
	"31": true, "32": true, "33": true, "34": true, "35": true, "36": true, "37": true, "38": true,
}

var validConditions = map[string]bool{
	"caries": true, "restauracion": true, "endodoncia": true, "ausente": true,
	"corona": true, "implante": true, "sellante": true,
	"fractura": true, "exodoncia": true, "protesis": true, "puente": true,
	"corona_temporal": true, "poste": true, "extruido": true, "intruido": true,
}

var validSurfaces = map[string]bool{"M": true, "D": true, "O": true, "V": true, "L": true}

var validStatuses = map[string]bool{
	"PROGRAMADA": true, "CONFIRMADA": true, "EN_SALA": true, "ATENDIDA": true, "CANCELADA": true,
}

func today() string {
	return time.Now().Format("2006-01-02")
}

func nowTime() string {
	return time.Now().Format("15:04")
}

func nowISO() string {
	return time.Now().UTC().Format(time.RFC3339)
}

// Periodontograma - RF-04
type PeriodontalExam struct {
	ID        string `json:"id"`
	PatientID string `json:"patientId"`
	ExamDate  string `json:"examDate"`
	CreatedBy string `json:"createdBy"`
	CreatedAt string `json:"createdAt"`
}

type PeriodontalMeasurement struct {
	ID       string `json:"id"`
	ExamID   string `json:"examId"`
	Tooth    string `json:"tooth"`
	Site     string `json:"site"`
	Depth    int    `json:"depth"`
	Bleeding bool   `json:"bleeding"`
	Calculus bool   `json:"calculus"`
}

// SOEP Notes - RF-05
type SOEPNote struct {
	ID         string `json:"id"`
	PatientID  string `json:"patientId"`
	Subjective string `json:"subjective"`
	Objective  string `json:"objective"`
	Evaluation string `json:"evaluation"`
	Plan       string `json:"plan"`
	CreatedBy  string `json:"createdBy"`
	CreatedAt  string `json:"createdAt"`
	Locked     bool   `json:"locked"`
}

// Treatment Budgets - RF-07
type TreatmentBudget struct {
	ID        string  `json:"id"`
	PatientID string `json:"patientId"`
	Total     float64 `json:"total"`
	Status    string `json:"status"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type TreatmentItem struct {
	ID          string  `json:"id"`
	BudgetID    string  `json:"budgetId"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
	Phase       string  `json:"phase"`
	Approved    bool    `json:"approved"`
	Converted   bool    `json:"converted"` // RF-08: Si ya fue convertido a turno
}

// Inventory - RF-14
type InventoryItem struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Category string `json:"category"`
	Stock    int    `json:"stock"`
	MinStock int    `json:"minStock"`
	Unit     string `json:"unit"`
}

type InventoryMovement struct {
	ID        string `json:"id"`
	ItemID    string `json:"itemId"`
	Quantity int    `json:"quantity"`
	Type      string `json:"type"`
	Reason    string `json:"reason"`
	CreatedAt string `json:"createdAt"`
}

// Consentimientos - RF-06
type Consent struct {
	ID         string `json:"id"`
	PatientID  string `json:"patientId"`
	Procedure  string `json:"procedure"`
	Content    string `json:"content"`
	SignedAt   string `json:"signedAt"`
	SignedBy   string `json:"signedBy"`
	CreatedAt  string `json:"createdAt"`
}

// Liquidación de Honorarios - RF-13
type Commission struct {
	ID            string  `json:"id"`
	ProfessionalID string `json:"professionalId"`
	Amount        float64 `json:"amount"`
	PaymentID     string `json:"paymentId"`
	Date          string `json:"date"`
	CreatedAt     string `json:"createdAt"`
}

// Radiografías/Archivos - Funcionalidad clínica extendida
type PatientAttachment struct {
	ID        string `json:"id"`
	PatientID string `json:"patientId"`
	Type      string `json:"type"` // radiograph, photo, document
	FileName  string `json:"fileName"`
	FileURL   string `json:"fileUrl"`
	FileSize  int64  `json:"fileSize"`
	Notes     string `json:"notes"`
	CreatedAt string `json:"createdAt"`
	CreatedBy string `json:"createdBy"`
}
type UserTOTP struct {
	UserID      string `json:"userId"`
	Secret      string `json:"secret"`
	Enabled     bool   `json:"enabled"`
	BackupCodes string `json:"backupCodes"`
	CreatedAt   string `json:"createdAt"`
}

// Notificaciones - RF-11
type Notification struct {
	ID         string `json:"id"`
	PatientID  string `json:"patientId"`
	Type       string `json:"type"` // reminder, confirmation, cancellation
	Channel    string `json:"channel"` // whatsapp, sms, email
	Status     string `json:"status"` // pending, sent, failed
	Message    string `json:"message"`
	ScheduledAt string `json:"scheduledAt"`
	SentAt     string `json:"sentAt"`
	CreatedAt  string `json:"createdAt"`
}

// Plantillas de notificación
type NotificationTemplate struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	Channel     string `json:"channel"`
	Subject     string `json:"subject"`
	Body        string `json:"body"`
	Variables   string `json:"variables"`
	Active      bool   `json:"active"`
	CreatedAt   string `json:"createdAt"`
}

// Facturación electrónica - RF-12
type Invoice struct {
	ID          string  `json:"id"`
	PatientID   string  `json:"patientId"`
	PaymentID   string  `json:"paymentId"`
	Number      string  `json:"number"`
	Amount      float64 `json:"amount"`
	Tax         float64 `json:"tax"`
	Total       float64 `json:"total"`
	CAE         string  `json:"cae"` // Código de autorización electrónico
	CAEDue      string  `json:"caeDue"`
	Status      string  `json:"status"` // draft, issued, cancelled
	CreatedAt   string  `json:"createdAt"`
	IssuedAt    string  `json:"issuedAt"`
}
