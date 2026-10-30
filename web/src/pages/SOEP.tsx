import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import type { SOEPNote } from '../types';
import { EmptyState, ErrorBanner, Spinner, Modal, Field } from '../ui';

export function SOEPPage() {
  const [notes, setNotes] = useState<SOEPNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const notify = useToast();

  useEffect(() => {
    setLoading(true);
    api.soepNotes('p1')
      .then(setNotes)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = {
      subjective: (form.elements.namedItem('subjective') as HTMLTextAreaElement).value,
      objective: (form.elements.namedItem('objective') as HTMLTextAreaElement).value,
      evaluation: (form.elements.namedItem('evaluation') as HTMLTextAreaElement).value,
      plan: (form.elements.namedItem('plan') as HTMLTextAreaElement).value,
    };
    try {
      await api.createSOEPNote('p1', input);
      notify('Nota SOEP creada exitosamente');
      setCreating(false);
      api.soepNotes('p1').then(setNotes);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  if (loading) return <Spinner label="Cargando notas SOEP…" />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div>
      <div className="toolbar">
        <h2>Notas SOEP</h2>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          + Nueva nota
        </button>
      </div>

      {notes.length === 0 ? (
        <EmptyState>No hay notas SOEP registradas.</EmptyState>
      ) : (
        <div className="list">
          {notes.map((note) => (
            <div key={note.id} className="list-item">
              <div>
                <strong>{note.createdAt}</strong>
                <span>Por {note.createdBy}</span>
              </div>
              <span className={note.locked ? 'badge badge-cancelada' : 'badge badge-programada'}>
                {note.locked ? 'Bloqueada (24h)' : 'Abierta'}
              </span>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="Nueva nota SOEP" onClose={() => setCreating(false)}>
          <form className="form-stack" onSubmit={handleCreate}>
            <Field label="Subjetivo (S)" required>
              <textarea name="subjective" className="input" rows={3} placeholder="Lo que el paciente refiere..." />
            </Field>
            <Field label="Objetivo (O)" required>
              <textarea name="objective" className="input" rows={3} placeholder="Hallazgos clínicos observados..." />
            </Field>
            <Field label="Evaluación (E)" required>
              <textarea name="evaluation" className="input" rows={3} placeholder="Diagnóstico y análisis..." />
            </Field>
            <Field label="Plan (P)" required>
              <textarea name="plan" className="input" rows={3} placeholder="Tratamiento y seguimiento..." />
            </Field>
            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
