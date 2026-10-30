import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import type { Consent } from '../types';
import { EmptyState, ErrorBanner, Spinner, Modal, Field } from '../ui';

export function ConsentsPage() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const notify = useToast();

  useEffect(() => {
    setLoading(true);
    api.consents('p1')
      .then(setConsents)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = {
      procedure: (form.elements.namedItem('procedure') as HTMLInputElement).value,
      content: (form.elements.namedItem('content') as HTMLTextAreaElement).value,
    };
    try {
      await api.createConsent('p1', input);
      notify('Consentimiento creado exitosamente');
      setCreating(false);
      api.consents('p1').then(setConsents);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  if (loading) return <Spinner label="Cargando consentimientos…" />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div>
      <div className="toolbar">
        <h2>Consentimientos Informados</h2>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          + Nuevo consentimiento
        </button>
      </div>

      {consents.length === 0 ? (
        <EmptyState>No hay consentimientos registrados.</EmptyState>
      ) : (
        <div className="list">
          {consents.map((consent) => (
            <div key={consent.id} className="list-item">
              <div>
                <strong>{consent.procedure}</strong>
                <span>Firmado por {consent.signedBy} el {consent.signedAt}</span>
              </div>
              <span className="badge badge-atendida">Firmado</span>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="Nuevo consentimiento informado" onClose={() => setCreating(false)}>
          <form className="form-stack" onSubmit={handleCreate}>
            <Field label="Procedimiento" required>
              <input name="procedure" type="text" className="input" placeholder="Extracción de pieza 48" />
            </Field>
            <Field label="Contenido del consentimiento" required>
              <textarea name="content" className="input" rows={6} placeholder="Descripción detallada del procedimiento, riesgos y beneficios..." />
            </Field>
            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Crear y firmar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
