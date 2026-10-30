# ADR-004 · Inmutabilidad clínica y auditoría encadenada

- **Estado:** Propuesto
- **Fecha:** 2026-10-29
- **Decisores:** Arquitectura, Seguridad, Dirección Médica
- **Relacionados:** RN-01, RN-10, RN-13, RF-18, RNF-07

---

## Contexto

La historia clínica y los documentos emitidos deben poder defenderse legalmente. El documento
fuente exige que un procedimiento `realizado` no se borre y que exista un log inmutable de
auditoría. Una tabla normal permite `UPDATE`/`DELETE` por error o por acción maliciosa.

## Decisión

1. **Append-only para hechos clínicos:** hallazgos de odontograma, notas SOEP firmadas,
   adendas, consentimientos, recetas y estudios periodontales no se actualizan ni eliminan.
   Las correcciones se hacen con un nuevo registro que referencia al anterior.
2. **Bloqueo a nivel de base de datos:** triggers que rechazan `UPDATE`/`DELETE` en tablas
   inmutables; permisos del rol de aplicación limitados a `INSERT`/`SELECT`.
3. **Sellado por hash:** cada registro firmado guarda `content_hash` (SHA-256 del contenido
   canónico) y `signed_at`.
4. **Auditoría encadenada:** `audit_event` guarda `prev_hash` y `hash`, formando una cadena
   verificable por período. Un job diario calcula y firma el ancla del día.
5. **Export verificable:** el auditor puede descargar un rango y verificar la cadena con una
   herramienta documentada.
6. **Retención:** los registros se archivan, no se borran, hasta vencer el plazo legal
   (RNF-20).

## Alternativas consideradas

| Alternativa | Pros | Contras | Veredicto |
|---|---|---|---|
| Solo soft delete | Simple. | No impide edición; evidencia débil. | Insuficiente. |
| Event sourcing completo | Auditoría total. | Complejidad alta para el equipo y el alcance. | Rechazada para v1. |
| **Append-only selectivo + hash chain** | Fuerte donde importa, simple de operar. | Requiere disciplina y triggers. | **Elegida.** |
| Blockchain | Inmutabilidad distribuida. | Sobrecosto y complejidad injustificados. | Rechazada. |

## Consecuencias

**Positivas**

- Evidencia legal sólida y detectable ante manipulación.
- Historial clínico reconstruible.
- Cumple RN-01, RN-10, RN-13 y RNF-07.

**Negativas / riesgos**

- Corregir un error requiere un flujo de adenda bien diseñado.
- La cadena de auditoría crece; se necesita archivado y verificación por lotes.
- Los triggers deben probarse en cada migración.

**Mitigaciones**

- UI clara de "adenda" y "anular".
- Job de verificación de integridad con alerta.
- Pruebas de inmutabilidad en CI (TP-06, TP-22).

## Implementación (resumen)

```sql
-- Ejemplo conceptual
CREATE TABLE clinical_note (
  id              uuid PRIMARY KEY,
  patient_id      uuid NOT NULL,
  author_id       uuid NOT NULL,
  content         jsonb NOT NULL,
  content_hash    text NOT NULL,
  signed_at       timestamptz,
  supersedes_id   uuid REFERENCES clinical_note(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION reject_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Registro inmutable: use adenda';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clinical_note_immutable
BEFORE UPDATE OR DELETE ON clinical_note
FOR EACH ROW EXECUTE FUNCTION reject_mutation();
```
