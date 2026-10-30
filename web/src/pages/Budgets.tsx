import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import type { TreatmentBudget, TreatmentItem } from '../types';
import { EmptyState, ErrorBanner, Spinner, Modal, Field } from '../ui';

export function BudgetsPage() {
  const [budgets, setBudgets] = useState<TreatmentBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<TreatmentBudget | null>(null);
  const [items, setItems] = useState<TreatmentItem[]>([]);
  const notify = useToast();

  useEffect(() => {
    setLoading(true);
    api.treatmentBudgets('p1')
      .then(setBudgets)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function openBudget(budget: TreatmentBudget) {
    setSelectedBudget(budget);
    setItems([]);
  }

  async function approveItem(_item: TreatmentItem) {
    try {
      notify('Ítem aprobado. En implementación completa, esto convertiría el ítem en un turno agendable.');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  if (loading) return <Spinner label="Cargando presupuestos…" />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div>
      <div className="toolbar">
        <h2>Presupuestos de Tratamiento</h2>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          + Nuevo presupuesto
        </button>
      </div>

      {budgets.length === 0 ? (
        <EmptyState>No hay presupuestos registrados.</EmptyState>
      ) : (
        <div className="list">
          {budgets.map((budget) => (
            <div key={budget.id} className="list-item">
              <div>
                <strong>${budget.total}</strong>
                <span>{budget.status} · {budget.createdAt}</span>
              </div>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => openBudget(budget)}>
                Ver ítems
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedBudget && (
        <Modal title={`Ítems del presupuesto (${selectedBudget.total})`} onClose={() => setSelectedBudget(null)}>
          {items.length === 0 ? (
            <EmptyState>No hay ítems en este presupuesto aún.</EmptyState>
          ) : (
            <div className="list">
              {items.map((item) => (
                <div key={item.id} className="list-item">
                  <div>
                    <strong>{item.description}</strong>
                    <span>Fase: {item.phase} · ${item.amount}</span>
                  </div>
                  {!item.approved && (
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => approveItem(item)}>
                      Aprobar
                    </button>
                  )}
                  {item.approved && <span className="badge badge-atendida">Aprobado</span>}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {creating && (
        <Modal title="Nuevo presupuesto" onClose={() => setCreating(false)}>
          <form className="form-stack">
            <Field label="Total del presupuesto ($)" required>
              <input type="number" className="input" placeholder="15000" />
            </Field>
            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary">
                Crear
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
