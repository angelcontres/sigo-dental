export type Role = 'admin' | 'odontologo' | 'recepcion';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Patient {
  id: string;
  name: string;
  doc: string;
  birth: string;
  phone: string;
  email: string;
  address: string;
  sedeId: string;
  allergies: string;
  notes: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientAllergies: string;
  professionalId: string;
  professionalName: string;
  chairId: string;
  chairName: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
  createdAt: string;
}

export type AppointmentStatus =
  | 'PROGRAMADA'
  | 'CONFIRMADA'
  | 'EN_SALA'
  | 'ATENDIDA'
  | 'CANCELADA';

export interface Finding {
  tooth: string;
  condition: string;
  surfaces: string[];
  note: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  patientId: string;
  patientName: string;
  concept: string;
  amount: number;
  method: string;
  date: string;
  time: string;
  closureId: string;
  createdBy: string;
}

export interface Closure {
  id: string;
  date: string;
  total: number;
  count: number;
  closedAt: string;
  closedBy: string;
}

export interface AuditEntry {
  id: number;
  at: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
}

export interface Sede {
  id: string;
  name: string;
  address: string;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  color: string;
}

export interface Chair {
  id: string;
  name: string;
  sedeId: string;
}

export interface Meta {
  sedes: Sede[];
  professionals: Professional[];
  chairs: Chair[];
}

export interface Dashboard {
  date: string;
  patients: number;
  appointments: number;
  pending: number;
  collected: number;
  alertCount: number;
  alerts: Patient[];
  todayAppointments: Appointment[];
  recentPayments: Payment[];
  upcoming: Appointment[];
  openCashPayments: number;
  openCashTotal: number;
}

export interface PatientDetail {
  patient: Patient;
  findings: Finding[];
  appointments: Appointment[];
}

// Periodontograma - RF-04
export interface PeriodontalExam {
  id: string;
  patientId: string;
  examDate: string;
  createdBy: string;
  createdAt: string;
}

export interface PeriodontalMeasurement {
  id: string;
  examId: string;
  tooth: string;
  site: string;
  depth: number;
  bleeding: boolean;
  calculus: boolean;
}

// SOEP Notes - RF-05
export interface SOEPNote {
  id: string;
  patientId: string;
  subjective: string;
  objective: string;
  evaluation: string;
  plan: string;
  createdBy: string;
  createdAt: string;
  locked: boolean;
}

// Treatment Budgets - RF-07
export interface TreatmentBudget {
  id: string;
  patientId: string;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentItem {
  id: string;
  budgetId: string;
  description: string;
  amount: number;
  phase: string;
  approved: boolean;
  converted?: boolean;
}

// Inventory - RF-14
export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  quantity: number;
  type: string;
  reason: string;
  createdAt: string;
}

// Consentimientos - RF-06
export interface Consent {
  id: string;
  patientId: string;
  procedure: string;
  content: string;
  signedAt: string;
  signedBy: string;
  createdAt: string;
}

// Comisiones - RF-13
export interface Commission {
  id: string;
  professionalId: string;
  amount: number;
  paymentId: string;
  date: string;
  createdAt: string;
}

// MFA / TOTP - RNF-05
export interface UserTOTP {
  userId: string;
  secret: string;
  enabled: boolean;
  backupCodes: string;
  createdAt: string;
}

// Notificaciones - RF-11
export interface Notification {
  id: string;
  patientId: string;
  type: string;
  channel: string;
  status: string;
  message: string;
  scheduledAt: string;
  sentAt: string;
  createdAt: string;
}

// Facturación electrónica - RF-12
export interface Invoice {
  id: string;
  patientId: string;
  paymentId: string;
  number: string;
  amount: number;
  tax: number;
  total: number;
  cae: string;
  caeDue: string;
  status: string;
  createdAt: string;
  issuedAt: string;
}

// Adjuntos de pacientes (radiografías, fotos, documentos)
export interface PatientAttachment {
  id: string;
  patientId: string;
  type: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  notes: string;
  createdAt: string;
  createdBy: string;
}
