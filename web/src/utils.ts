import type { AppointmentStatus } from './types';

export const TEETH_UPPER = [
  '18', '17', '16', '15', '14', '13', '12', '11',
  '21', '22', '23', '24', '25', '26', '27', '28',
];

export const TEETH_LOWER = [
  '48', '47', '46', '45', '44', '43', '42', '41',
  '31', '32', '33', '34', '35', '36', '37', '38',
];

export const CONDITIONS: Record<string, { label: string; color: string }> = {
  caries: { label: 'Caries', color: '#d32f2f' },
  restauracion: { label: 'Restauración', color: '#1565c0' },
  endodoncia: { label: 'Endodoncia', color: '#6a1b9a' },
  ausente: { label: 'Ausente', color: '#90a4ae' },
  corona: { label: 'Corona', color: '#b8860b' },
  implante: { label: 'Implante', color: '#2e7d32' },
  sellante: { label: 'Sellante', color: '#f9a825' },
};

export const STATUS: Record<AppointmentStatus, { label: string; cls: string }> = {
  PROGRAMADA: { label: 'Programada', cls: 'badge-programada' },
  CONFIRMADA: { label: 'Confirmada', cls: 'badge-confirmada' },
  EN_SALA: { label: 'En sala', cls: 'badge-en-sala' },
  ATENDIDA: { label: 'Atendida', cls: 'badge-atendida' },
  CANCELADA: { label: 'Cancelada', cls: 'badge-cancelada' },
};

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Administración',
  odontologo: 'Odontología',
  recepcion: 'Recepción',
};

export function todayISO(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatLongDate(iso: string): string {
  if (!iso) return '—';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  const text = date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function money(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function ageFrom(birth: string): string {
  if (!birth) return '—';
  const date = new Date(`${birth}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) age -= 1;
  return age >= 0 ? String(age) : '—';
}

export function hasAlert(allergies: string): boolean {
  const value = (allergies || '').trim().toLowerCase();
  return Boolean(value) && !['ninguna', 'ninguno', 'sin alergias', 'no'].includes(value);
}

export function universal(fdi: string): string {
  const quadrant = Number(fdi[0]);
  const position = Number(fdi[1]);
  if (quadrant === 1) return String(9 - position);
  if (quadrant === 2) return String(8 + position);
  if (quadrant === 3) return String(16 + position);
  if (quadrant === 4) return String(33 - position);
  return fdi;
}

export function statusLabel(status: AppointmentStatus): string {
  return STATUS[status]?.label ?? status;
}

export function statusClass(status: AppointmentStatus): string {
  return STATUS[status]?.cls ?? '';
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 8 && cleaned.length <= 15;
}

export function validateDNI(doc: string): boolean {
  const cleaned = doc.replace(/\D/g, '');
  return cleaned.length >= 6 && cleaned.length <= 10;
}
