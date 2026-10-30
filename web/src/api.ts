import type {
  Appointment,
  AppointmentStatus,
  AuditEntry,
  Closure,
  Dashboard,
  Finding,
  Meta,
  Patient,
  PatientDetail,
  Payment,
  User,
  PeriodontalExam,
  PeriodontalMeasurement,
  SOEPNote,
  TreatmentBudget,
  InventoryItem,
  InventoryMovement,
  Consent,
  Commission,
  Notification as NotificationType,
  Invoice,
  PatientAttachment,
} from './types';

const TOKEN_KEY = 'sigo.token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. ¿Está corriendo la API?');
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Error ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

function query(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<User>('/me'),

  meta: () => request<Meta>('/meta'),

  dashboard: (date?: string, sede?: string) =>
    request<Dashboard>(`/dashboard${query({ date, sede })}`),

  patients: (q?: string, sede?: string) =>
    request<Patient[]>(`/patients${query({ q, sede })}`),

  patient: (id: string) => request<PatientDetail>(`/patients/${id}`),

  createPatient: (input: Partial<Patient>) =>
    request<Patient>('/patients', { method: 'POST', body: JSON.stringify(input) }),

  updatePatient: (id: string, input: Partial<Patient>) =>
    request<Patient>(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(input) }),

  deletePatient: (id: string) =>
    request<void>(`/patients/${id}`, { method: 'DELETE' }),

  odontogram: (patientId: string) =>
    request<Finding[]>(`/patients/${patientId}/odontogram`),

  saveFinding: (
    patientId: string,
    tooth: string,
    input: { condition: string; surfaces: string[]; note: string },
  ) =>
    request<Finding | void>(`/patients/${patientId}/odontogram/${tooth}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  appointments: (date: string, sede?: string) =>
    request<Appointment[]>(`/appointments${query({ date, sede })}`),

  createAppointment: (input: {
    patientId: string;
    professionalId: string;
    chairId: string;
    date: string;
    time: string;
    reason: string;
  }) =>
    request<{ id: string }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateAppointment: (id: string, status: AppointmentStatus) =>
    request<{ id: string; status: string }>(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  payments: (date: string) => request<Payment[]>(`/payments${query({ date })}`),

  createPayment: (input: {
    patientId: string;
    concept: string;
    amount: number;
    method: string;
  }) =>
    request<Payment>('/payments', { method: 'POST', body: JSON.stringify(input) }),

  closeCash: () => request<Closure>('/cash/close', { method: 'POST' }),

  closures: () => request<Closure[]>('/closures'),

  audit: (limit = 150) => request<AuditEntry[]>(`/audit${query({ limit: String(limit) })}`),

  users: () => request<User[]>('/users'),

  createUser: (input: { name: string; email: string; password: string; role: string }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(input) }),

  // Periodontograma - RF-04
  periodontalExams: (patientId: string) =>
    request<PeriodontalExam[]>(`/patients/${patientId}/periodontal-exams`),
  createPeriodontalExam: (patientId: string, input: { examDate: string }) =>
    request<PeriodontalExam>(`/patients/${patientId}/periodontal-exams`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  periodontalMeasurements: (examId: string) =>
    request<PeriodontalMeasurement[]>(`/periodontal-exams/${examId}/measurements`),
  savePeriodontalMeasurement: (examId: string, input: {
    tooth: string;
    site: string;
    depth: number;
    bleeding: boolean;
    calculus: boolean;
  }) =>
    request<PeriodontalMeasurement>(`/periodontal-exams/${examId}/measurements`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // SOEP Notes - RF-05
  soepNotes: (patientId: string) =>
    request<SOEPNote[]>(`/patients/${patientId}/soep-notes`),
  createSOEPNote: (patientId: string, input: {
    subjective: string;
    objective: string;
    evaluation: string;
    plan: string;
  }) =>
    request<SOEPNote>(`/patients/${patientId}/soep-notes`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // Treatment Budgets - RF-07
  treatmentBudgets: (patientId: string) =>
    request<TreatmentBudget[]>(`/patients/${patientId}/treatment-budgets`),
  createTreatmentBudget: (patientId: string, input: { total: number; status?: string }) =>
    request<TreatmentBudget>(`/patients/${patientId}/treatment-budgets`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // Inventory - RF-14
  inventory: () => request<InventoryItem[]>('/inventory'),
  createInventoryItem: (input: {
    name: string;
    category: string;
    stock: number;
    minStock: number;
    unit: string;
  }) =>
    request<InventoryItem>('/inventory', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  createInventoryMovement: (input: {
    itemId: string;
    quantity: number;
    type: string;
    reason: string;
  }) =>
    request<InventoryMovement>('/inventory/movements', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // Consentimientos - RF-06
  consents: (patientId: string) =>
    request<Consent[]>(`/patients/${patientId}/consents`),
  createConsent: (patientId: string, input: { procedure: string; content: string }) =>
    request<Consent>(`/patients/${patientId}/consents`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // Comisiones - RF-13
  commissions: () => request<Commission[]>('/commissions'),

  // MFA / TOTP - RNF-05
  totpStatus: () => request<{ enabled: boolean; configured: boolean }>('/totp/status'),
  totpSetup: () => request<{ secret: string; backupCodes: string; enabled: boolean }>('/totp/setup'),
  totpEnable: (code: string) => request<{ enabled: boolean }>('/totp/enable', {
    method: 'POST',
    body: JSON.stringify({ code }),
  }),
  totpDisable: () => request<{ enabled: boolean }>('/totp/disable', {
    method: 'POST',
  }),

  // Notificaciones - RF-11
  notifications: (limit?: number, offset?: number) => 
    request<NotificationType[]>(`/notifications?limit=${limit || 100}&offset=${offset || 0}`),
  createNotification: (input: { patientId: string; type: string; channel: string; message: string; scheduledAt?: string }) =>
    request<NotificationType>('/notifications', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  sendReminder: (appointmentId: string) =>
    request<{ notificationId: string; message: string }>(`/appointments/${appointmentId}/reminder`, {
      method: 'POST',
    }),

  // Facturación electrónica - RF-12
  invoices: (limit?: number, offset?: number) =>
    request<Invoice[]>(`/invoices?limit=${limit || 100}&offset=${offset || 0}`),
  createInvoice: (input: { paymentId: string; amount: number; tax: number }) =>
    request<Invoice>('/invoices', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  issueInvoice: (invoiceId: string) =>
    request<{ status: string; cae: string; message: string }>(`/invoices/${invoiceId}/issue`, {
      method: 'POST',
    }),

  // Adjuntos de pacientes (radiografías, fotos, documentos)
  patientAttachments: (patientId: string) =>
    request<PatientAttachment[]>(`/patients/${patientId}/attachments`),
  createPatientAttachment: (patientId: string, input: { type: string; fileName: string; fileUrl: string; fileSize: number; notes: string }) =>
    request<PatientAttachment>(`/patients/${patientId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // Caja - RN-02 (cierre ciego)
  cashCount: () => request<{ count: number }>('/cash/count'),
};
