import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAppData } from '../appdata';
import { useToast } from '../toast';
import type { Patient, PeriodontalExam, PeriodontalMeasurement } from '../types';
import { EmptyState, ErrorBanner, Spinner, Modal, Field } from '../ui';
import { todayISO } from '../utils';

export function PeriodontogramPage() {
  const { sedeId } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const notify = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(searchParams.get('patientId') || '');
  const [exams, setExams] = useState<PeriodontalExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [examDate, setExamDate] = useState(todayISO());

  const [selectedExam, setSelectedExam] = useState<PeriodontalExam | null>(null);
  const [measurements, setMeasurements] = useState<PeriodontalMeasurement[]>([]);
  const [addingMeasurement, setAddingMeasurement] = useState(false);

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

  // Load exams for selected patient
  useEffect(() => {
    if (!patientId) {
      setExams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .periodontalExams(patientId)
      .then((res) => {
        setExams(res);
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
      await api.createPeriodontalExam(patientId, { examDate });
      notify('Examen periodontal creado exitosamente');
      setCreating(false);
      const updated = await api.periodontalExams(patientId);
      setExams(updated);
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
      depth: parseInt((form.elements.namedItem('depth') as HTMLInputElement).value, 10),
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

  if (loading && patients.length === 0) return <Spinner label="Cargando periodontograma…" />;
  if (error) return <ErrorBanner message={error} />;

  if (patients.length === 0) {
    return (
      <EmptyState>
        No hay pacientes registrados en esta sede. <Link to="/pacientes">Creá uno</Link> para realizar un examen periodontal.
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
          onClick={() => {
            setExamDate(todayISO());
            setCreating(true);
          }}
          disabled={!patientId}
        >
          + Nuevo examen
        </button>
      </div>

      {loading ? (
        <Spinner label="Cargando exámenes del paciente…" />
      ) : exams.length === 0 ? (
        <EmptyState>
          No hay exámenes periodontales registrados para este paciente. Hacé clic en "+ Nuevo examen" para iniciar una ficha periodontal.
        </EmptyState>
      ) : (
        <div className="list">
          {exams.map((exam) => (
            <div key={exam.id} className="list-item">
              <div>
                <strong>Fecha del examen: {exam.examDate}</strong>
                <span>Registrado por: {exam.createdBy || 'Odontólogo'}</span>
              </div>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => openExam(exam)}>
                Ver mediciones (6 puntos)
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedExam && (
        <Modal title={`Mediciones del examen periodontal (${selectedExam.examDate})`} onClose={() => setSelectedExam(null)}>
          <div className="toolbar" style={{ marginBottom: '1rem' }}>
            <span className="muted">Sondaje periodontal en 6 sitios por pieza</span>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setAddingMeasurement(true)}>
              + Agregar medición
            </button>
          </div>
          {measurements.length === 0 ? (
            <EmptyState>No hay mediciones registradas en este examen aún.</EmptyState>
          ) : (
            <div className="list">
              {measurements.map((m) => (
                <div key={m.id} className="list-item">
                  <div>
                    <strong>Pieza FDI #{m.tooth}</strong>
                    <span>
                      Sitio: {m.site} · Profundidad de sondaje: <strong>{m.depth} mm</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {m.bleeding && <span className="badge badge-cancelada">Sangrado (BOP)</span>}
                    {m.calculus && <span className="badge badge-programada">Cálculo</span>}
                    {!m.bleeding && !m.calculus && <span className="badge badge-confirmada">Sano</span>}
                  </div>
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
              <input
                name="examDate"
                type="date"
                className="input"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                required
              />
            </Field>
            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Crear examen
              </button>
            </div>
          </form>
        </Modal>
      )}

      {addingMeasurement && selectedExam && (
        <Modal title="Nueva medición periodontal" onClose={() => setAddingMeasurement(false)}>
          <form className="form-stack" onSubmit={handleAddMeasurement}>
            <Field label="Diente (Notación FDI)" required>
              <input name="tooth" type="text" className="input" placeholder="Ej. 16, 21, 36, 48" required />
            </Field>
            <Field label="Sitio anatómico" required>
              <select name="site" className="input">
                <option value="MB">Mesio-Vestibular (MB)</option>
                <option value="B">Vestibular central (V/B)</option>
                <option value="DB">Disto-Vestibular (DB)</option>
                <option value="ML">Mesio-Lingual/Palatino (ML)</option>
                <option value="L">Lingual/Palatino central (L/P)</option>
                <option value="DL">Disto-Lingual/Palatino (DL)</option>
              </select>
            </Field>
            <Field label="Profundidad de sondaje (mm)" required>
              <input name="depth" type="number" className="input" placeholder="Ej. 3" min="0" max="15" required />
            </Field>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input name="bleeding" type="checkbox" /> Sangrado al sondaje (BOP)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input name="calculus" type="checkbox" /> Cálculo dental
              </label>
            </div>
            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setAddingMeasurement(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Guardar medición
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
