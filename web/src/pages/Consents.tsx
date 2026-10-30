import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAppData } from '../appdata';
import { useToast } from '../toast';
import type { Consent, Patient } from '../types';
import { EmptyState, ErrorBanner, Spinner, Modal, Field } from '../ui';

export function ConsentsPage() {
  const { sedeId } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const notify = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(searchParams.get('patientId') || '');
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<Consent | null>(null);

  // Form state
  const [procedure, setProcedure] = useState('');
  const [content, setContent] = useState('');

  // Load patients
  useEffect(() => {
    let cancelled = false;
    api
      .patients(undefined, sedeId || undefined)
      .then((items) => {
        if (cancelled) return;
        setPatients(items);
        if (!patientId && items.length > 0) {
          setPatientId(items[0].id);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [sedeId]);

  // Load consents for selected patient
  useEffect(() => {
    if (!patientId) {
      setConsents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .consents(patientId)
      .then((res) => {
        setConsents(res);
        setError('');
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  function handlePatientChange(newId: string) {
    setPatientId(newId);
    setSearchParams({ patientId: newId });
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!patientId || !procedure || !content) {
      notify('Completa todos los campos', 'error');
      return;
    }
    try {
      await api.createConsent(patientId, { procedure, content });
      notify('Consentimiento informado creado exitosamente');
      setCreating(false);
      setProcedure('');
      setContent('');
      const updated = await api.consents(patientId);
      setConsents(updated);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  if (loading && patients.length === 0) return <Spinner label="Cargando consentimientos…" />;
  if (error) return <ErrorBanner message={error} />;

  if (patients.length === 0) {
    return (
      <EmptyState>
        No hay pacientes registrados en esta sede. <Link to="/pacientes">Creá uno</Link> para gestionar consentimientos.
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="toolbar toolbar-wrap">
        <label className="field-inline">
          <span>Paciente</span>
          <select
            className="input"
            value={patientId}
            onChange={(e) => handlePatientChange(e.target.value)}
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.doc})
              </option>
            ))}
          </select>
        </label>
        <span className="spacer" />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setCreating(true)}
          disabled={!patientId}
        >
          + Nuevo consentimiento
        </button>
      </div>

      {loading ? (
        <Spinner label="Cargando consentimientos del paciente…" />
      ) : consents.length === 0 ? (
        <EmptyState>
          No hay consentimientos informados registrados para este paciente. Hacé clic en "+ Nuevo consentimiento" para redactar uno.
        </EmptyState>
      ) : (
        <div className="list">
          {consents.map((consent) => (
            <div
              key={consent.id}
              className="list-item"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedConsent(consent)}
            >
              <div>
                <strong>{consent.procedure}</strong>
                <span>
                  Firmado digitalmente por {consent.signedBy || 'Paciente'} el{' '}
                  {consent.signedAt ? new Date(consent.signedAt).toLocaleDateString() : 'Fecha s/d'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="badge badge-atendida">Firmado</span>
                <button type="button" className="btn btn-sm btn-secondary">
                  Ver documento
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Detalle de consentimiento */}
      {selectedConsent && (
        <Modal
          title={`Consentimiento: ${selectedConsent.procedure}`}
          onClose={() => setSelectedConsent(null)}
        >
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <strong>Procedimiento:</strong> {selectedConsent.procedure}
            </div>
            <div>
              <strong>Términos y contenido:</strong>
              <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                {selectedConsent.content}
              </p>
            </div>
            <div
              className="muted"
              style={{
                fontSize: '0.85rem',
                borderTop: '1px solid #eee',
                paddingTop: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Firmante: <strong>{selectedConsent.signedBy || 'Paciente'}</strong></span>
              <span>Fecha: <strong>{selectedConsent.signedAt ? new Date(selectedConsent.signedAt).toLocaleString() : '—'}</strong></span>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Nuevo consentimiento */}
      {creating && (
        <Modal title="Nuevo consentimiento informado" onClose={() => setCreating(false)}>
          <form className="form-stack" onSubmit={handleCreate}>
            <Field label="Procedimiento odontológico" required>
              <input
                name="procedure"
                type="text"
                className="input"
                placeholder="Ej. Exodoncia de tercer molar retenido (pieza 38)"
                value={procedure}
                onChange={(e) => setProcedure(e.target.value)}
                required
              />
            </Field>
            <Field label="Texto del consentimiento informado" required>
              <textarea
                name="content"
                className="input"
                rows={6}
                placeholder="Yo, el paciente arriba mencionado, autorizo la realización del procedimiento, habiendo sido informado de los riesgos, beneficios y posibles alternativas terapéuticas..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </Field>
            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Crear y registrar firma
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
