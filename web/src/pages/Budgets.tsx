import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAppData } from '../appdata';
import { useToast } from '../toast';
import type { Patient, TreatmentBudget, TreatmentItem } from '../types';
import { EmptyState, ErrorBanner, Spinner, Modal, Field } from '../ui';
import { todayISO } from '../utils';

export function BudgetsPage() {
  const { meta, sedeId } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const notify = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(searchParams.get('patientId') || '');
  const [budgets, setBudgets] = useState<TreatmentBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [creatingBudget, setCreatingBudget] = useState(false);
  const [budgetTotal, setBudgetTotal] = useState('');
  const [budgetStatus, setBudgetStatus] = useState('PENDIENTE');

  const [selectedBudget, setSelectedBudget] = useState<TreatmentBudget | null>(null);
  const [items, setItems] = useState<TreatmentItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Add Item to budget state
  const [addingItem, setAddingItem] = useState(false);
  const [itemDescription, setItemDescription] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemPhase, setItemPhase] = useState('Fase 1');

  // Convert Item to Appointment state
  const [convertingItem, setConvertingItem] = useState<TreatmentItem | null>(null);
  const [convDate, setConvDate] = useState(todayISO());
  const [convTime, setConvTime] = useState('09:00');
  const [convProfId, setConvProfId] = useState(meta.professionals[0]?.id || '');
  const [convChairId, setConvChairId] = useState(meta.chairs[0]?.id || '');

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

  // Load budgets when patient changes
  useEffect(() => {
    if (!patientId) {
      setBudgets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .treatmentBudgets(patientId)
      .then((res) => {
        setBudgets(res);
        setError('');
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  function handlePatientChange(newId: string) {
    setPatientId(newId);
    setSearchParams({ patientId: newId });
  }

  async function handleCreateBudget(e: FormEvent) {
    e.preventDefault();
    const total = parseFloat(budgetTotal);
    if (!total || total <= 0) {
      notify('El total debe ser mayor a 0', 'error');
      return;
    }
    try {
      await api.createTreatmentBudget(patientId, { total, status: budgetStatus });
      notify('Presupuesto creado con éxito');
      setCreatingBudget(false);
      setBudgetTotal('');
      const updated = await api.treatmentBudgets(patientId);
      setBudgets(updated);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  async function openBudget(budget: TreatmentBudget) {
    setSelectedBudget(budget);
    setLoadingItems(true);
    try {
      const res = await api.treatmentItems(budget.id);
      setItems(res);
    } catch {
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }

  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    if (!selectedBudget) return;
    const amount = parseFloat(itemAmount);
    if (!itemDescription || !amount || amount <= 0) {
      notify('Completa la descripción y un monto válido', 'error');
      return;
    }
    try {
      await api.createTreatmentItem(selectedBudget.id, {
        description: itemDescription,
        amount,
        phase: itemPhase,
      });
      notify('Ítem agregado al presupuesto');
      setAddingItem(false);
      setItemDescription('');
      setItemAmount('');
      const updatedItems = await api.treatmentItems(selectedBudget.id);
      setItems(updatedItems);
      // Reload budgets to refresh total
      const updatedBudgets = await api.treatmentBudgets(patientId);
      setBudgets(updatedBudgets);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  async function handleApproveItem(item: TreatmentItem) {
    try {
      await api.approveTreatmentItem(item.id);
      notify(`Ítem "${item.description}" aprobado`);
      if (selectedBudget) {
        const updatedItems = await api.treatmentItems(selectedBudget.id);
        setItems(updatedItems);
      }
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  async function handleConvertItem(e: FormEvent) {
    e.preventDefault();
    if (!convertingItem) return;
    try {
      await api.convertTreatmentItem(convertingItem.id, {
        date: convDate,
        time: convTime,
        professionalId: convProfId,
        chairId: convChairId,
      });
      notify(`Turno agendado exitosamente para "${convertingItem.description}"`);
      setConvertingItem(null);
      if (selectedBudget) {
        const updatedItems = await api.treatmentItems(selectedBudget.id);
        setItems(updatedItems);
      }
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  if (loading && patients.length === 0) return <Spinner label="Cargando presupuestos…" />;
  if (error) return <ErrorBanner message={error} />;

  if (patients.length === 0) {
    return (
      <EmptyState>
        No hay pacientes registrados en esta sede. <Link to="/pacientes">Creá uno</Link> para gestionar presupuestos.
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
          onClick={() => setCreatingBudget(true)}
          disabled={!patientId}
        >
          + Nuevo presupuesto
        </button>
      </div>

      {loading ? (
        <Spinner label="Cargando presupuestos del paciente…" />
      ) : budgets.length === 0 ? (
        <EmptyState>
          No hay presupuestos registrados para este paciente. Hacé clic en "+ Nuevo presupuesto" para registrar uno.
        </EmptyState>
      ) : (
        <div className="list">
          {budgets.map((budget) => (
            <div key={budget.id} className="list-item">
              <div>
                <strong>${budget.total.toLocaleString()}</strong>
                <span>
                  Estado: {budget.status} · Creado: {budget.createdAt ? new Date(budget.createdAt).toLocaleDateString() : '—'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => openBudget(budget)}
              >
                Ver fases e ítems
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Ver y gestionar ítems de presupuesto */}
      {selectedBudget && (
        <Modal
          title={`Ítems del presupuesto ($${selectedBudget.total.toLocaleString()})`}
          onClose={() => {
            setSelectedBudget(null);
            setAddingItem(false);
          }}
        >
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted">Estado: {selectedBudget.status}</span>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setAddingItem(!addingItem)}
            >
              {addingItem ? 'Cancelar ítem' : '+ Agregar ítem'}
            </button>
          </div>

          {addingItem && (
            <form onSubmit={handleAddItem} className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
              <h4>Nuevo ítem de tratamiento</h4>
              <Field label="Descripción del tratamiento" required>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej. Endodoncia pieza 16"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  required
                />
              </Field>
              <div className="grid grid-2">
                <Field label="Fase" required>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ej. Fase 1 - Terapéutica"
                    value={itemPhase}
                    onChange={(e) => setItemPhase(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Monto ($)" required>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="12000"
                    value={itemAmount}
                    onChange={(e) => setItemAmount(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  Guardar ítem
                </button>
              </div>
            </form>
          )}

          {loadingItems ? (
            <Spinner label="Cargando ítems..." />
          ) : items.length === 0 ? (
            <EmptyState>No hay ítems registrados en este presupuesto.</EmptyState>
          ) : (
            <div className="list">
              {items.map((item) => (
                <div key={item.id} className="list-item" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <strong>{item.description}</strong>
                    <span>
                      {item.phase} · ${item.amount.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {!item.approved ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleApproveItem(item)}
                      >
                        Aprobar
                      </button>
                    ) : item.converted ? (
                      <span className="badge badge-atendida">Agendado en turno</span>
                    ) : (
                      <>
                        <span className="badge badge-confirmada">Aprobado</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => setConvertingItem(item)}
                        >
                          Agendar turno
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Modal: Agendar turno a partir de ítem aprobado (RF-08) */}
      {convertingItem && (
        <Modal
          title={`Agendar turno para: ${convertingItem.description}`}
          onClose={() => setConvertingItem(null)}
        >
          <form className="form-stack" onSubmit={handleConvertItem}>
            <div className="grid grid-2">
              <Field label="Fecha" required>
                <input
                  type="date"
                  className="input"
                  value={convDate}
                  onChange={(e) => setConvDate(e.target.value)}
                  required
                />
              </Field>
              <Field label="Hora" required>
                <input
                  type="time"
                  className="input"
                  value={convTime}
                  onChange={(e) => setConvTime(e.target.value)}
                  required
                />
              </Field>
            </div>
            <Field label="Profesional" required>
              <select
                className="input"
                value={convProfId}
                onChange={(e) => setConvProfId(e.target.value)}
                required
              >
                {meta.professionals.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name} ({pr.specialty})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sillón" required>
              <select
                className="input"
                value={convChairId}
                onChange={(e) => setConvChairId(e.target.value)}
                required
              >
                {meta.chairs.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="modal-actions">
              <span className="spacer" />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConvertingItem(null)}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Confirmar turno
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Crear presupuesto */}
      {creatingBudget && (
        <Modal title="Nuevo presupuesto de tratamiento" onClose={() => setCreatingBudget(false)}>
          <form className="form-stack" onSubmit={handleCreateBudget}>
            <Field label="Total estimado del presupuesto ($)" required>
              <input
                type="number"
                step="0.01"
                className="input"
                placeholder="Ej. 25000"
                value={budgetTotal}
                onChange={(e) => setBudgetTotal(e.target.value)}
                required
              />
            </Field>
            <Field label="Estado inicial">
              <select
                className="input"
                value={budgetStatus}
                onChange={(e) => setBudgetStatus(e.target.value)}
              >
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="EN_CURSO">EN_CURSO</option>
                <option value="APROBADO">APROBADO</option>
              </select>
            </Field>
            <div className="modal-actions">
              <span className="spacer" />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCreatingBudget(false)}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Guardar presupuesto
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
