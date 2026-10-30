import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAppData } from '../appdata';
import { useAuth } from '../auth';
import { Odontogram } from '../components/Odontogram';
import { PatientForm } from '../components/PatientForm';
import { useToast } from '../toast';
import type { PatientAttachment, PatientDetail, Prescription } from '../types';
import { EmptyState, ErrorBanner, Field, Modal, Spinner, StatusBadge } from '../ui';
import { ageFrom, formatDate, hasAlert, initials } from '../utils';

type Tab = 'datos' | 'odonto' | 'turnos' | 'adjuntos' | 'recetas';

export function PatientDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { meta } = useAppData();
  const notify = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab;
  const tab: Tab = ['datos', 'odonto', 'turnos', 'adjuntos', 'recetas'].includes(tabParam)
    ? tabParam
    : 'datos';

  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  // RF-20: Adjuntos
  const [attachments, setAttachments] = useState<PatientAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [addingAttachment, setAddingAttachment] = useState(false);
  const [attType, setAttType] = useState('radiograph');
  const [attName, setAttName] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [attNotes, setAttNotes] = useState('');

  // RF-21: Recetas
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [addingPrescription, setAddingPrescription] = useState(false);
  const [rxMedication, setRxMedication] = useState('');
  const [rxDose, setRxDose] = useState('');
  const [rxRoute, setRxRoute] = useState('Oral');
  const [rxFrequency, setRxFrequency] = useState('Cada 8 horas');
  const [rxDuration, setRxDuration] = useState('5 días');
  const [rxInstructions, setRxInstructions] = useState('');
  const [rxProfId, setRxProfId] = useState(meta.professionals[0]?.id || '');
  const [allergyConfirmModal, setAllergyConfirmModal] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError('');
    api
      .patient(id)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load attachments when tab active
  useEffect(() => {
    if (tab === 'adjuntos' && id) {
      setLoadingAttachments(true);
      api
        .patientAttachments(id)
        .then(setAttachments)
        .catch(() => setAttachments([]))
        .finally(() => setLoadingAttachments(false));
    }
  }, [tab, id]);

  // Load prescriptions when tab active
  useEffect(() => {
    if (tab === 'recetas' && id) {
      setLoadingPrescriptions(true);
      api
        .prescriptions(id)
        .then(setPrescriptions)
        .catch(() => setPrescriptions([]))
        .finally(() => setLoadingPrescriptions(false));
    }
  }, [tab, id]);

  if (error) return <ErrorBanner message={error} />;
  if (!detail) return <Spinner />;

  const { patient, findings, appointments } = detail;
  const sede = meta.sedes.find((item) => item.id === patient.sedeId);
  const canEditClinical = user?.role === 'admin' || user?.role === 'odontologo';

  async function remove() {
    if (!window.confirm(`¿Dar de baja a ${patient.name}? (Baja lógica RN-09: su historial quedará resguardado en auditoría)`)) {
      return;
    }
    try {
      await api.deletePatient(patient.id);
      notify('Paciente dado de baja exitosamente.');
      navigate('/pacientes');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  // Create attachment (RF-20)
  async function handleCreateAttachment(e: FormEvent) {
    e.preventDefault();
    if (!attName) return;
    try {
      await api.createPatientAttachment(patient.id, {
        type: attType,
        fileName: attName,
        fileUrl: attUrl || 'https://placehold.co/600x400/0f6e6e/ffffff?text=Radiografia+' + encodeURIComponent(attName),
        fileSize: 1024 * 350,
        notes: attNotes,
      });
      notify('Archivo adjuntado correctamente');
      setAddingAttachment(false);
      setAttName('');
      setAttUrl('');
      setAttNotes('');
      const updated = await api.patientAttachments(patient.id);
      setAttachments(updated);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  // Create prescription (RF-21)
  async function handleCreateRx(ignoreWarning = false) {
    try {
      await api.createPrescription(patient.id, {
        professionalId: rxProfId,
        medication: rxMedication,
        dose: rxDose,
        route: rxRoute,
        frequency: rxFrequency,
        duration: rxDuration,
        instructions: rxInstructions,
        ignoreWarning,
      });
      notify('Receta digital emitida correctamente');
      setAddingPrescription(false);
      setAllergyConfirmModal(null);
      setRxMedication('');
      setRxDose('');
      setRxInstructions('');
      const updated = await api.prescriptions(patient.id);
      setPrescriptions(updated);
    } catch (err: any) {
      if (err.message && err.message.includes('ALERTA_ALERGIA')) {
        setAllergyConfirmModal(err.message);
      } else {
        notify(err.message, 'error');
      }
    }
  }

  async function handleCancelRx(prescriptionId: string) {
    const reason = window.prompt('Motivo de anulación de la receta:');
    if (!reason) return;
    try {
      await api.cancelPrescription(prescriptionId, reason);
      notify('Receta anulada');
      const updated = await api.prescriptions(patient.id);
      setPrescriptions(updated);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  return (
    <>
      <Link className="back-link" to="/pacientes">
        ← Volver a pacientes
      </Link>

      <section className="card patient-hero">
        <div className="patient-identity">
          <span className="avatar avatar-lg">{initials(patient.name)}</span>
          <div>
            <h2>{patient.name}</h2>
            <p className="muted">
              {patient.doc} · {ageFrom(patient.birth)} años · {sede?.name ?? 'Sin sede'}
            </p>
          </div>
        </div>
        <div className="patient-hero-actions">
          {hasAlert(patient.allergies) && (
            <span className="badge badge-danger">⚠ Alerta: {patient.allergies}</span>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
            Editar ficha
          </button>
          {user?.role === 'admin' && (
            <button type="button" className="btn btn-danger" onClick={remove}>
              Dar de baja
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <Link to={`/soep?patientId=${patient.id}`} className="btn btn-sm btn-secondary">
            Notas SOEP
          </Link>
          <Link to={`/presupuestos?patientId=${patient.id}`} className="btn btn-sm btn-secondary">
            Presupuestos
          </Link>
          <Link to={`/periodontograma?patientId=${patient.id}`} className="btn btn-sm btn-secondary">
            Periodontograma
          </Link>
          <Link to={`/consentimientos?patientId=${patient.id}`} className="btn btn-sm btn-secondary">
            Consentimientos
          </Link>
        </div>
      </section>

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'datos'}
          className={`tab${tab === 'datos' ? ' active' : ''}`}
          onClick={() => setSearchParams({ tab: 'datos' })}
        >
          Datos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'odonto'}
          className={`tab${tab === 'odonto' ? ' active' : ''}`}
          onClick={() => setSearchParams({ tab: 'odonto' })}
        >
          Odontograma <span className="pill">{findings.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'turnos'}
          className={`tab${tab === 'turnos' ? ' active' : ''}`}
          onClick={() => setSearchParams({ tab: 'turnos' })}
        >
          Turnos <span className="pill">{appointments.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'adjuntos'}
          className={`tab${tab === 'adjuntos' ? ' active' : ''}`}
          onClick={() => setSearchParams({ tab: 'adjuntos' })}
        >
          Adjuntos y Rayos X
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'recetas'}
          className={`tab${tab === 'recetas' ? ' active' : ''}`}
          onClick={() => setSearchParams({ tab: 'recetas' })}
        >
          Recetas Digitales
        </button>
      </div>

      {/* TAB 1: DATOS */}
      {tab === 'datos' && (
        <section className="card">
          <div className="detail-grid">
            <div>
              <span>Documento</span>
              <strong>{patient.doc}</strong>
            </div>
            <div>
              <span>Fecha de nacimiento</span>
              <strong>{formatDate(patient.birth)}</strong>
            </div>
            <div>
              <span>Teléfono</span>
              <strong>{patient.phone || '—'}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{patient.email || '—'}</strong>
            </div>
            <div>
              <span>Dirección</span>
              <strong>{patient.address || '—'}</strong>
            </div>
            <div>
              <span>Sede</span>
              <strong>{sede?.name ?? '—'}</strong>
            </div>
            <div>
              <span>Cobertura / Seguro Dental</span>
              <strong>{patient.insurance || 'Particular (Sin cobertura)'}</strong>
            </div>
            <div className="detail-wide">
              <span>Alergias / alertas médicas</span>
              <strong className={hasAlert(patient.allergies) ? 'text-danger' : ''}>
                {patient.allergies || 'Sin alertas registradas'}
              </strong>
            </div>

            {/* RN-08: Tutor legal */}
            {patient.guardianName && (
              <div className="detail-wide" style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Tutor Legal (RN-08):</span>
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>{patient.guardianName}</strong> ({patient.guardianRel || 'Tutor'}) · Doc: {patient.guardianDoc || '—'} · Tel: {patient.guardianPhone}
                </p>
              </div>
            )}

            <div className="detail-wide">
              <span>Notas</span>
              <strong>{patient.notes || '—'}</strong>
            </div>
          </div>
          {appointments.length > 0 && (
            <p className="muted small detail-footnote">
              Último turno: {formatDate(appointments[0].date)} · {appointments[0].status}
            </p>
          )}
        </section>
      )}

      {/* TAB 2: ODONTOGRAMA */}
      {tab === 'odonto' && (
        <Odontogram patientId={patient.id} canEdit={canEditClinical} />
      )}

      {/* TAB 3: TURNOS */}
      {tab === 'turnos' && (
        <section className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Profesional</th>
                <th>Sillón</th>
                <th>Motivo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState>Este paciente todavía no tiene turnos.</EmptyState>
                  </td>
                </tr>
              ) : (
                appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td data-label="Fecha">{formatDate(appointment.date)}</td>
                    <td data-label="Hora">{appointment.time}</td>
                    <td data-label="Profesional">{appointment.professionalName}</td>
                    <td data-label="Sillón">{appointment.chairName}</td>
                    <td data-label="Motivo">{appointment.reason || '—'}</td>
                    <td data-label="Estado">
                      <StatusBadge status={appointment.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* TAB 4: ADJUNTOS Y RADIOGRAFÍAS (RF-20) */}
      {tab === 'adjuntos' && (
        <section className="card">
          <div className="toolbar" style={{ marginBottom: '1rem' }}>
            <h3>Radiografías y Documentos Clínicos</h3>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setAddingAttachment(true)}
            >
              + Subir radiografía / archivo
            </button>
          </div>

          {loadingAttachments ? (
            <Spinner label="Cargando adjuntos…" />
          ) : attachments.length === 0 ? (
            <EmptyState>
              No hay radiografías ni documentos adjuntos para este paciente. Hacé clic en "+ Subir radiografía / archivo" para agregar estudios periapicales, panorámicas o fotos clínicas.
            </EmptyState>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {attachments.map((att) => (
                <div key={att.id} className="card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ height: '140px', background: '#1e293b', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {att.type === 'radiograph' || att.type === 'photo' ? (
                      <img
                        src={att.fileUrl}
                        alt={att.fileName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ color: '#fff', fontSize: '2rem' }}>📄</span>
                    )}
                  </div>
                  <div>
                    <strong>{att.fileName}</strong>
                    <p className="muted small" style={{ margin: '0.2rem 0' }}>
                      Tipo: {att.type} · {new Date(att.createdAt).toLocaleDateString()}
                    </p>
                    {att.notes && <p className="small" style={{ margin: 0 }}>{att.notes}</p>}
                  </div>
                  <a
                    href={att.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-secondary"
                    style={{ textAlign: 'center', marginTop: 'auto' }}
                  >
                    Ver archivo completo
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 5: RECETAS DIGITALES (RF-21) */}
      {tab === 'recetas' && (
        <section className="card">
          <div className="toolbar" style={{ marginBottom: '1rem' }}>
            <h3>Recetas Médicas y Prescripciones</h3>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setAddingPrescription(true)}
            >
              + Emitir nueva receta
            </button>
          </div>

          {loadingPrescriptions ? (
            <Spinner label="Cargando recetas…" />
          ) : prescriptions.length === 0 ? (
            <EmptyState>
              No hay recetas emitidas para este paciente. Hacé clic en "+ Emitir nueva receta" para prescribir medicamentos con validación automática de alergias.
            </EmptyState>
          ) : (
            <div className="list">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="list-item" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ flex: '1 1 280px' }}>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>
                      {rx.medication} ({rx.dose})
                    </strong>
                    <p style={{ margin: '0.25rem 0', fontWeight: 500 }}>
                      Indicación: {rx.frequency} por {rx.duration} · Vía: {rx.route}
                    </p>
                    {rx.instructions && (
                      <p className="small muted" style={{ margin: '0.25rem 0' }}>
                        Instrucciones: {rx.instructions}
                      </p>
                    )}
                    <span className="small muted">
                      Emitido el {new Date(rx.createdAt).toLocaleDateString()} por {rx.professionalName || 'Odontólogo'}
                    </span>
                    {rx.cancelledReason && (
                      <p className="text-danger small" style={{ margin: '0.25rem 0' }}>
                        Anulada por motivo: {rx.cancelledReason}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`badge badge-${rx.status === 'activa' ? 'atendida' : 'cancelada'}`}>
                      {rx.status.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => window.print()}
                      title="Imprimir receta"
                    >
                      🖨 Imprimir
                    </button>
                    {rx.status === 'activa' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => handleCancelRx(rx.id)}
                      >
                        Anular
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal: Subir adjunto (RF-20) */}
      {addingAttachment && (
        <Modal title="Adjuntar radiografía o archivo clínico" onClose={() => setAddingAttachment(false)}>
          <form className="form-stack" onSubmit={handleCreateAttachment}>
            <Field label="Tipo de archivo" required>
              <select className="input" value={attType} onChange={(e) => setAttType(e.target.value)}>
                <option value="radiograph">Radiografía (Periapical / Panorámica)</option>
                <option value="photo">Fotografía intraoral / clínica</option>
                <option value="document">Estudio externo / PDF</option>
              </select>
            </Field>
            <Field label="Nombre del estudio / archivo" required>
              <input
                className="input"
                placeholder="Ej. Rx Periapical Pieza 36"
                value={attName}
                onChange={(e) => setAttName(e.target.value)}
                required
              />
            </Field>
            <Field label="URL o enlace del archivo (opcional)">
              <input
                className="input"
                placeholder="https://... o dejar vacío para generar imagen clínica demostrativa"
                value={attUrl}
                onChange={(e) => setAttUrl(e.target.value)}
              />
            </Field>
            <Field label="Notas clínicas o hallazgos radiográficos">
              <textarea
                className="input"
                rows={3}
                placeholder="Zona radiolúcida periapical, reabsorción ósea, etc."
                value={attNotes}
                onChange={(e) => setAttNotes(e.target.value)}
              />
            </Field>
            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setAddingAttachment(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Guardar adjunto
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Emitir receta digital (RF-21) */}
      {addingPrescription && (
        <Modal title="Emitir receta médica digital" onClose={() => setAddingPrescription(false)}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateRx(false);
            }}
          >
            {hasAlert(patient.allergies) && (
              <div className="error-banner" role="alert">
                ⚠ Alertas médicas del paciente: <strong>{patient.allergies}</strong>. El sistema verificará contraindicaciones al prescribir.
              </div>
            )}
            <Field label="Medicamento / Principio activo" required>
              <input
                className="input"
                placeholder="Ej. Amoxicilina + Ácido Clavulánico, Ibuprofeno, etc."
                value={rxMedication}
                onChange={(e) => setRxMedication(e.target.value)}
                required
              />
            </Field>
            <div className="grid grid-2">
              <Field label="Concentración / Dosis" required>
                <input
                  className="input"
                  placeholder="Ej. 875/125 mg o 600 mg"
                  value={rxDose}
                  onChange={(e) => setRxDose(e.target.value)}
                  required
                />
              </Field>
              <Field label="Vía de administración" required>
                <select className="input" value={rxRoute} onChange={(e) => setRxRoute(e.target.value)}>
                  <option value="Oral">Oral</option>
                  <option value="Tópica">Tópica</option>
                  <option value="Sublingual">Sublingual</option>
                  <option value="Intramuscular">Intramuscular</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-2">
              <Field label="Frecuencia" required>
                <input
                  className="input"
                  placeholder="Ej. Cada 8 horas, Cada 12 horas"
                  value={rxFrequency}
                  onChange={(e) => setRxFrequency(e.target.value)}
                  required
                />
              </Field>
              <Field label="Duración del tratamiento" required>
                <input
                  className="input"
                  placeholder="Ej. 7 días, 5 días"
                  value={rxDuration}
                  onChange={(e) => setRxDuration(e.target.value)}
                  required
                />
              </Field>
            </div>
            <Field label="Indicaciones adicionales">
              <textarea
                className="input"
                rows={2}
                placeholder="Tomar después de las comidas. Abundante agua."
                value={rxInstructions}
                onChange={(e) => setRxInstructions(e.target.value)}
              />
            </Field>
            <Field label="Profesional prescriptor" required>
              <select className="input" value={rxProfId} onChange={(e) => setRxProfId(e.target.value)}>
                {meta.professionals.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name} ({pr.specialty})
                  </option>
                ))}
              </select>
            </Field>
            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setAddingPrescription(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Emitir receta
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de confirmación de alergia médica */}
      {allergyConfirmModal && (
        <Modal title="¡Atención! Advertencia por alergia del paciente" onClose={() => setAllergyConfirmModal(null)}>
          <div className="form-stack">
            <p style={{ color: '#dc2626', fontWeight: 600 }}>
              {allergyConfirmModal}
            </p>
            <p className="small muted">
              Según las normas de seguridad del SRS, se requiere confirmación explícita del profesional para continuar con la emisión de esta receta.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setAllergyConfirmModal(null)}>
                Descartar prescripción
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleCreateRx(true)}
              >
                Confirmar prescripción bajo mi responsabilidad
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Editar paciente */}
      {editing && (
        <Modal title="Editar paciente" onClose={() => setEditing(false)} wide>
          <PatientForm
            initial={patient}
            sedes={meta.sedes}
            onSaved={(saved) => {
              setEditing(false);
              setDetail((prev) =>
                prev
                  ? {
                      ...prev,
                      patient: saved,
                    }
                  : prev,
              );
              notify('Paciente actualizado.');
            }}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      )}
    </>
  );
}
