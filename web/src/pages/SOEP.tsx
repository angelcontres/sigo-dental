import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAppData } from '../appdata';
import { useToast } from '../toast';
import type { Patient, SOEPNote } from '../types';
import { EmptyState, ErrorBanner, Spinner, Modal, Field } from '../ui';
import { formatDate } from '../utils';

export function SOEPPage() {
  const { sedeId } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const notify = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(searchParams.get('patientId') || '');
  const [notes, setNotes] = useState<SOEPNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SOEPNote | null>(null);

  // Form states
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [evaluation, setEvaluation] = useState('');
  const [plan, setPlan] = useState('');

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

  // Load notes for selected patient
  useEffect(() => {
    if (!patientId) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .soepNotes(patientId)
      .then((res) => {
        setNotes(res);
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
    if (!patientId) return;
    try {
      await api.createSOEPNote(patientId, {
        subjective,
        objective,
        evaluation,
        plan,
      });
      notify('Nota SOEP creada exitosamente');
      setCreating(false);
      setSubjective('');
      setObjective('');
      setEvaluation('');
      setPlan('');
      const updated = await api.soepNotes(patientId);
      setNotes(updated);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  if (loading && patients.length === 0) return <Spinner label="Cargando notas SOEP…" />;
  if (error) return <ErrorBanner message={error} />;

  if (patients.length === 0) {
    return (
      <EmptyState>
        No hay pacientes registrados en esta sede. <Link to="/pacientes">Creá uno</Link> para registrar notas SOEP.
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
          + Nueva nota SOEP
        </button>
      </div>

      {loading ? (
        <Spinner label="Cargando notas del paciente…" />
      ) : notes.length === 0 ? (
        <EmptyState>
          No hay notas SOEP registradas para este paciente. Hacé clic en "+ Nueva nota SOEP" para agregar la primera evolución.
        </EmptyState>
      ) : (
        <div className="list">
          {notes.map((note) => (
            <div
              key={note.id}
              className="list-item"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedNote(note)}
            >
              <div>
                <strong>
                  {note.createdAt ? formatDate(note.createdAt.substring(0, 10)) : 'Fecha s/d'}
                </strong>
                <span>
                  Profesional: {note.createdBy || 'Odontólogo'} · {note.subjective ? note.subjective.substring(0, 60) + '...' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className={note.locked ? 'badge badge-cancelada' : 'badge badge-programada'}>
                  {note.locked ? 'Bloqueada (24h)' : 'Abierta'}
                </span>
                <button type="button" className="btn btn-sm btn-secondary">
                  Ver detalle
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Detalle de Nota SOEP */}
      {selectedNote && (
        <Modal
          title={`Evolución Clínica SOEP · ${selectedNote.createdAt ? formatDate(selectedNote.createdAt.substring(0, 10)) : ''}`}
          onClose={() => setSelectedNote(null)}
        >
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <strong style={{ color: 'var(--primary, #0f6e6e)' }}>[S] Subjetivo (Motivo de consulta / Síntomas):</strong>
              <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{selectedNote.subjective || '—'}</p>
            </div>
            <div>
              <strong style={{ color: 'var(--primary, #0f6e6e)' }}>[O] Objetivo (Examen clínico y signos):</strong>
              <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{selectedNote.objective || '—'}</p>
            </div>
            <div>
              <strong style={{ color: 'var(--primary, #0f6e6e)' }}>[E] Evaluación (Diagnóstico y juicio clínico):</strong>
              <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{selectedNote.evaluation || '—'}</p>
            </div>
            <div>
              <strong style={{ color: 'var(--primary, #0f6e6e)' }}>[P] Plan (Conducta terapéutica e indicaciones):</strong>
              <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{selectedNote.plan || '—'}</p>
            </div>
            <div className="muted" style={{ fontSize: '0.85rem', borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
              Registrado por: <strong>{selectedNote.createdBy}</strong> · Estado:{' '}
              {selectedNote.locked ? 'Bloqueado por transcurso de 24hs' : 'Vigente'}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Crear nota SOEP */}
      {creating && (
        <Modal title="Nueva nota de evolución SOEP" onClose={() => setCreating(false)}>
          <form className="form-stack" onSubmit={handleCreate}>
            <Field label="Subjetivo (S) - Lo que el paciente refiere" required>
              <textarea
                name="subjective"
                className="input"
                rows={3}
                placeholder="Motivo de consulta, dolor, evolución según el paciente..."
                value={subjective}
                onChange={(e) => setSubjective(e.target.value)}
                required
              />
            </Field>
            <Field label="Objetivo (O) - Signos clínicos observados" required>
              <textarea
                name="objective"
                className="input"
                rows={3}
                placeholder="Inspección, percusión, palpación, pruebas de vitalidad..."
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                required
              />
            </Field>
            <Field label="Evaluación (E) - Diagnóstico clínico" required>
              <textarea
                name="evaluation"
                className="input"
                rows={3}
                placeholder="Diagnóstico presuntivo o definitivo..."
                value={evaluation}
                onChange={(e) => setEvaluation(e.target.value)}
                required
              />
            </Field>
            <Field label="Plan (P) - Tratamiento e indicaciones" required>
              <textarea
                name="plan"
                className="input"
                rows={3}
                placeholder="Procedimiento efectuado hoy y citas futuras..."
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                required
              />
            </Field>
            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Guardar nota SOEP
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
