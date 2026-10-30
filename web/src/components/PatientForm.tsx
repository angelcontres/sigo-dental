import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import type { Patient, Sede } from '../types';
import { Field } from '../ui';
import { validateEmail, validatePhone, validateDNI } from '../utils';

interface FormState {
  name: string;
  doc: string;
  birth: string;
  phone: string;
  email: string;
  address: string;
  sedeId: string;
  allergies: string;
  notes: string;
}

export function PatientForm({
  initial,
  sedes,
  onSaved,
  onCancel,
}: {
  initial?: Patient;
  sedes: Sede[];
  onSaved: (patient: Patient) => void;
  onCancel: () => void;
}) {
  const notify = useToast();
  const [form, setForm] = useState<FormState>({
    name: initial?.name ?? '',
    doc: initial?.doc ?? '',
    birth: initial?.birth ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    address: initial?.address ?? '',
    sedeId: initial?.sedeId ?? sedes[0]?.id ?? '',
    allergies: initial?.allergies ?? '',
    notes: initial?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (form.name.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres.');
      return;
    }
    if (!form.doc.trim()) {
      setError('El documento es obligatorio.');
      return;
    }
    if (form.doc.trim().length < 6) {
      setError('El documento debe tener al menos 6 caracteres.');
      return;
    }
    if (form.birth && new Date(form.birth) > new Date()) {
      setError('La fecha de nacimiento no puede ser futura.');
      return;
    }
    if (form.email && !validateEmail(form.email)) {
      setError('El email debe ser válido.');
      return;
    }
    if (form.phone && !validatePhone(form.phone)) {
      setError('El teléfono debe ser válido (mínimo 8 dígitos).');
      return;
    }
    if (!validateDNI(form.doc)) {
      setError('El documento debe tener entre 6 y 10 dígitos.');
      return;
    }
    if (!form.sedeId) {
      setError('Elegí una sede.');
      return;
    }

    setSaving(true);
    try {
      const saved = initial
        ? await api.updatePatient(initial.id, form)
        : await api.createPatient(form);
      notify(initial ? 'Paciente actualizado.' : 'Paciente creado.');
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="form-stack" aria-label={initial ? 'Editar paciente' : 'Crear nuevo paciente'}>
      {error && <div className="error-banner" role="alert">⚠ {error}</div>}

      <div className="form-grid">
        <Field label="Nombre y apellido" required>
          <input
            className="input"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            autoFocus
            autoComplete="name"
            aria-required="true"
          />
        </Field>
        <Field label="Documento" required>
          <input
            className="input"
            value={form.doc}
            onChange={(event) => update('doc', event.target.value)}
            autoComplete="off"
            aria-required="true"
          />
        </Field>
        <Field label="Fecha de nacimiento">
          <input
            className="input"
            type="date"
            value={form.birth}
            onChange={(event) => update('birth', event.target.value)}
            autoComplete="bday"
          />
        </Field>
        <Field label="Teléfono">
          <input
            className="input"
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
            autoComplete="tel"
          />
        </Field>
        <Field label="Email">
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label="Sede" required>
          <select
            className="input"
            value={form.sedeId}
            onChange={(event) => update('sedeId', event.target.value)}
            aria-required="true"
          >
            {sedes.map((sede) => (
              <option key={sede.id} value={sede.id}>
                {sede.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dirección" wide>
          <input
            className="input"
            value={form.address}
            onChange={(event) => update('address', event.target.value)}
            autoComplete="street-address"
          />
        </Field>
        <Field
          label="Alergias / alertas"
          wide
          hint="Se muestra como alerta médica en el panel y en la agenda."
        >
          <input
            className="input"
            value={form.allergies}
            placeholder="Ej.: Penicilina (severa)"
            onChange={(event) => update('allergies', event.target.value)}
            aria-describedby="allergies-hint"
          />
        </Field>
        <Field label="Notas" wide>
          <textarea
            className="input"
            rows={3}
            value={form.notes}
            onChange={(event) => update('notes', event.target.value)}
          />
        </Field>
      </div>

      <div className="modal-actions">
        <span className="spacer" />
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
