import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import type { PeriodontalExam, PeriodontalMeasurement } from '../types';
import { EmptyState, ErrorBanner, Spinner, Modal, Field } from '../ui';

export function PeriodontogramPage() {
  const [exams, setExams] = useState<PeriodontalExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedExam, setSelectedExam] = useState<PeriodontalExam | null>(null);
  const [measurements, setMeasurements] = useState<PeriodontalMeasurement[]>([]);
  const [addingMeasurement, setAddingMeasurement] = useState(false);
  const notify = useToast();

  useEffect(() => {
    setLoading(true);
    api.periodontalExams('p1')
      .then(setExams)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = {
      examDate: (form.elements.namedItem('examDate') as HTMLInputElement).value,
    };
    try {
      await api.createPeriodontalExam('p1', input);
      notify('Examen periodontal creado exitosamente');
      setCreating(false);
      api.periodontalExams('p1').then(setExams);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  function openExam(exam: PeriodontalExam) {
    setSelectedExam(exam);
    api.periodontalMeasurements(exam.id).then(setMeasurements);
  }

  async function handleAddMeasurement(e: FormEvent) {
    e.preventDefault();
    if (!selectedExam) return;
    const form = e.target as HTMLFormElement;
    const input = {
      tooth: (form.elements.namedItem('tooth') as HTMLInputElement).value,
      site: (form.elements.namedItem('site') as HTMLSelectElement).value,
      depth: parseInt((form.elements.namedItem('depth') as HTMLInputElement).value),
      bleeding: (form.elements.namedItem('bleeding') as HTMLInputElement).checked,
      calculus: (form.elements.namedItem('calculus') as HTMLInputElement).checked,
    };
    try {
      await api.savePeriodontalMeasurement(selectedExam.id, input);
      notify('Medición guardada exitosamente');
      setAddingMeasurement(false);
      api.periodontalMeasurements(selectedExam.id).then(setMeasurements);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  if (loading) return <Spinner label="Cargando periodontograma…" />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div>
      <div className="toolbar">
        <h2>Periodontograma</h2>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          + Nuevo examen
        </button>
      </div>

      {exams.length === 0 ? (
        <EmptyState>No hay exámenes periodontales registrados.</EmptyState>
      ) : (
        <div className="list">
          {exams.map((exam) => (
            <div key={exam.id} className="list-item">
              <div>
                <strong>{exam.examDate}</strong>
                <span>Por {exam.createdBy}</span>
              </div>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => openExam(exam)}>
                Ver mediciones
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedExam && (
        <Modal title={`Mediciones del examen ${selectedExam.examDate}`} onClose={() => setSelectedExam(null)}>
          <div className="toolbar">
            <h3>Mediciones (6 puntos por diente)</h3>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setAddingMeasurement(true)}>
              + Agregar medición
            </button>
          </div>
          {measurements.length === 0 ? (
            <EmptyState>No hay mediciones registradas en este examen.</EmptyState>
          ) : (
            <div className="list">
              {measurements.map((m) => (
                <div key={m.id} className="list-item">
                  <div>
                    <strong>Diente {m.tooth}</strong>
                    <span>Site {m.site} · Profundidad: {m.depth}mm</span>
                  </div>
                  {m.bleeding && <span className="badge badge-cancelada">Sangrado</span>}
                  {m.calculus && <span className="badge badge-cancelada">Cálculo</span>}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {creating && (
        <Modal title="Nuevo examen periodontal" onClose={() => setCreating(false)}>
          <form className="form-stack" onSubmit={handleCreate}>
            <Field label="Fecha del examen" required>
              <input name="examDate" type="date" className="input" />
            </Field>
            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Crear
              </button>
            </div>
          </form>
        </Modal>
      )}

      {addingMeasurement && selectedExam && (
        <Modal title="Nueva medición periodontal" onClose={() => setAddingMeasurement(false)}>
          <form className="form-stack" onSubmit={handleAddMeasurement}>
            <Field label="Diente (FDI)" required>
              <input name="tooth" type="text" className="input" placeholder="36" />
            </Field>
            <Field label="Sitio" required>
              <select name="site" className="input">
                <option value="MB">Mesial-Bucal</option>
                <option value="B">Bucal</option>
                <option value="DB">Distal-Bucal</option>
                <option value="ML">Mesial-Lingual</option>
                <option value="L">Lingual</option>
                <option value="DL">Distal-Lingual</option>
              </select>
            </Field>
            <Field label="Profundidad (mm)" required>
              <input name="depth" type="number" className="input" placeholder="3" min="0" max="15" />
            </Field>
            <div>
              <label>
                <input name="bleeding" type="checkbox" /> Sangrado al sondaje
              </label>
            </div>
            <div>
              <label>
                <input name="calculus" type="checkbox" /> Cálculo presente
              </label>
            </div>
            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setAddingMeasurement(false)}>
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
