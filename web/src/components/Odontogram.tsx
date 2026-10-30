import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import type { Finding } from '../types';
import {
  CONDITIONS,
  TEETH_LOWER,
  TEETH_UPPER,
  universal,
} from '../utils';
import { EmptyState, Spinner } from '../ui';

const SURFACES = ['M', 'D', 'O', 'V', 'L'];

export function Odontogram({
  patientId,
  canEdit,
}: {
  patientId: string;
  canEdit: boolean;
}) {
  const notify = useToast();
  const [findings, setFindings] = useState<Record<string, Finding>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [condition, setCondition] = useState('');
  const [surfaces, setSurfaces] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelected(null);
    api
      .odontogram(patientId)
      .then((items) => {
        if (cancelled) return;
        const map: Record<string, Finding> = {};
        for (const item of items) map[item.tooth] = item;
        setFindings(map);
      })
      .catch((error: Error) => notify(error.message, 'error'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId, notify]);

  const markedCount = useMemo(() => Object.keys(findings).length, [findings]);

  function selectTooth(tooth: string) {
    const finding = findings[tooth];
    setSelected(tooth);
    setCondition(finding?.condition ?? '');
    setSurfaces(finding?.surfaces ?? []);
    setNote(finding?.note ?? '');
  }

  function toggleSurface(surface: string) {
    setSurfaces((prev) =>
      prev.includes(surface) ? prev.filter((s) => s !== surface) : [...prev, surface],
    );
  }

  async function save(nextCondition: string) {
    if (!selected) return;

    if (nextCondition && note && note.length > 500) {
      notify('La nota no puede exceder 500 caracteres.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (!nextCondition) {
        await api.saveFinding(patientId, selected, {
          condition: '',
          surfaces: [],
          note: '',
        });
        setFindings((prev) => {
          const copy = { ...prev };
          delete copy[selected];
          return copy;
        });
        notify('Marca quitada.');
      } else {
        const saved = await api.saveFinding(patientId, selected, {
          condition: nextCondition,
          surfaces,
          note,
        });
        setFindings((prev) => ({
          ...prev,
          [selected]: {
            tooth: selected,
            condition: nextCondition,
            surfaces,
            note,
            updatedAt: (saved as Finding | undefined)?.updatedAt ?? new Date().toISOString(),
          },
        }));
        notify('Hallazgo guardado.');
      }
      setCondition(nextCondition);
    } catch (error) {
      notify((error as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner label="Cargando odontograma…" />;

  const renderArch = (teeth: string[]) => (
    <div className="teeth">
      {teeth.map((tooth) => {
        const finding = findings[tooth];
        const meta = finding ? CONDITIONS[finding.condition] : undefined;
        const classes = [
          'tooth',
          finding ? 'marked' : '',
          selected === tooth ? 'selected' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={tooth}
            type="button"
            className={classes}
            style={meta ? ({ '--c': meta.color } as CSSProperties) : undefined}
            onClick={() => selectTooth(tooth)}
            title={`${tooth}${meta ? ` · ${meta.label}` : ' · sin marca'}`}
          >
            <span className="tooth-num">{tooth}</span>
            <span className="tooth-mark" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="odonto-layout">
      <div className="card odonto-card">
        <div className="legend">
          {Object.entries(CONDITIONS).map(([key, meta]) => (
            <span key={key} className="legend-item">
              <span className="legend-dot" style={{ background: meta.color }} />
              {meta.label}
            </span>
          ))}
        </div>

        <div className="arches">
          <div className="arch">
            <div className="arch-title">Arcada superior</div>
            {renderArch(TEETH_UPPER)}
          </div>
          <div className="arch">
            <div className="arch-title">Arcada inferior</div>
            {renderArch(TEETH_LOWER)}
          </div>
        </div>

        <p className="muted small">
          Notación FDI · {markedCount} hallazgo{markedCount === 1 ? '' : 's'} registrado
          {markedCount === 1 ? '' : 's'}.
        </p>
      </div>

      <aside className="card tooth-panel">
        {!selected ? (
          <>
            <h2>Seleccioná un diente</h2>
            <p className="muted small">
              Hacé clic en una pieza para ver o cargar un hallazgo.
            </p>
            {!canEdit && (
              <p className="hint-box">Tu rol puede consultar el odontograma, pero no editarlo.</p>
            )}
          </>
        ) : (
          <>
            <h2>Diente {selected}</h2>
            <p className="muted small">
              FDI {selected} · Universal {universal(selected)}
            </p>

            {canEdit ? (
              <div className="tooth-form">
                <label className="field">
                  <span>Condición</span>
                  <select
                    className="input"
                    value={condition}
                    onChange={(event) => setCondition(event.target.value)}
                  >
                    <option value="">Sin marca</option>
                    {Object.entries(CONDITIONS).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset className="surfaces">
                  <legend>Superficies</legend>
                  {SURFACES.map((surface) => (
                    <label key={surface}>
                      <input
                        type="checkbox"
                        checked={surfaces.includes(surface)}
                        onChange={() => toggleSurface(surface)}
                      />
                      {surface}
                    </label>
                  ))}
                </fieldset>

                <label className="field">
                  <span>Nota</span>
                  <textarea
                    className="input"
                    rows={3}
                    value={note}
                    placeholder="Ej.: caries oclusal profunda"
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>

                <div className="row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving}
                    onClick={() => save(condition)}
                  >
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={saving || !findings[selected]}
                    onClick={() => save('')}
                  >
                    Quitar marca
                  </button>
                </div>
                <p className="muted small">
                  {findings[selected]
                    ? 'Hallazgo guardado para este paciente.'
                    : 'Sin marca en este diente.'}
                </p>
              </div>
            ) : (
              <div className="tooth-readonly">
                {findings[selected] ? (
                  <>
                    <p>
                      <strong>{CONDITIONS[findings[selected].condition]?.label}</strong>
                      {findings[selected].surfaces.length > 0 &&
                        ` · superficies ${findings[selected].surfaces.join(', ')}`}
                    </p>
                    {findings[selected].note && <p className="muted">{findings[selected].note}</p>}
                  </>
                ) : (
                  <EmptyState>Sin hallazgos en este diente.</EmptyState>
                )}
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
