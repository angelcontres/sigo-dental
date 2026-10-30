# ADR-003 · Aislamiento multi-sede

- **Estado:** Propuesto
- **Fecha:** 2026-10-29
- **Decisores:** Arquitectura, Seguridad, Dirección
- **Relacionados:** RF-26, RNF-06, RNF-09

---

## Contexto

La clínica puede operar en varias sedes. Los datos de agenda, caja y stock son por sede, pero
el paciente y su historia clínica son **únicos y transversales**. Un usuario puede trabajar
en una o varias sedes y no debe ver datos de sedes no asignadas (salvo roles consolidados).

## Decisión

1. Modelo **single database, shared schema** con columna `location_id` en toda entidad
   operativa.
2. El `TenantContext` (usuario, roles, sedes permitidas, sede activa) se deriva del JWT y de
   la cabecera `X-Location-Id`, validada contra las sedes asignadas.
3. Los repositorios aplican el filtro de sede de forma obligatoria; un test de arquitectura
   verifica que no existan consultas sin contexto.
4. Se habilita **Row-Level Security (RLS)** de PostgreSQL como defensa en profundidad en las
   tablas operativas.
5. Las entidades clínicas y de paciente **no** se duplican por sede: son globales.
6. Los archivos usan prefijo por sede y URLs firmadas.

## Alternativas consideradas

| Alternativa | Pros | Contras | Veredicto |
|---|---|---|---|
| Base de datos por sede | Aislamiento fuerte. | Migraciones y reportes multi-sede complejos; sobrecosto. | Rechazada. |
| Esquema por sede | Aislamiento medio. | Explosión de esquemas y migraciones. | Rechazada. |
| **Shared schema + `location_id` + RLS** | Simple, reportes consolidados, un solo esquema. | Requiere disciplina y tests. | **Elegida.** |
| Sin multi-sede (una sola) | Menos complejidad. | No cumple RF-26. | Rechazada. |

## Consecuencias

**Positivas**

- Reportes consolidados sencillos.
- Un solo juego de migraciones.
- Costo operativo bajo.

**Negativas / riesgos**

- Un error de filtrado podría exponer datos de otra sede.
- RLS agrega complejidad de configuración.

**Mitigaciones**

- Filtro obligatorio en la capa de repositorio.
- Tests de aislamiento por sede en CI.
- Revisión de seguridad específica.
- RLS activo en producción.

## Reglas

- `location_id` es obligatorio en: turnos, cajas, movimientos de stock, gastos, series de
  comprobantes, bloques de agenda y usuarios-sede.
- `patient`, `clinical_note`, `odontogram` y `consent` son globales; el acceso se controla
  por permisos y relación asistencial.
- Un usuario sin sede activa no puede operar; el administrador puede operar en modo
  consolidado (solo lectura agregada).
