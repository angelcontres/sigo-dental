# ADR-001 · Estilo arquitectónico: monolito modular

- **Estado:** Propuesto
- **Fecha:** 2026-10-29
- **Decisores:** Arquitectura, TI Lead, Product Owner
- **Relacionados:** ADR-002, SRS RNF-04, RNF-16

---

## Contexto

SIGO-Dental debe entregarse en 12 sprints con un equipo pequeño (≤ 8 personas), un dominio
con reglas transaccionales fuertes (agenda, caja, stock) y requisitos de auditoría. El
documento fuente sugería microservicios, pero no existe evidencia de que el volumen ni la
organización los justifiquen.

Los módulos identificados (pacientes, clínica, agenda, tratamientos, finanzas, inventario,
administración, auditoría) tienen límites claros pero comparten transacciones críticas:
cobrar requiere turno, presupuesto y caja; completar un procedimiento afecta stock y
tratamiento.

## Decisión

Implementar un **monolito modular**:

- Una sola aplicación desplegable (API NestJS) organizada por módulos de dominio.
- Una sola base de datos PostgreSQL con esquemas por módulo.
- Comunicación entre módulos por *facades* internas y eventos de dominio (outbox), nunca por
  acceso directo a tablas ajenas.
- Workers separados para tareas asíncronas, compartiendo el mismo código y modelo.

## Alternativas consideradas

| Alternativa | Pros | Contras | Veredicto |
|---|---|---|---|
| Microservicios | Escalado independiente, equipos autónomos. | Costo operativo, transacciones distribuidas, latencia, equipo insuficiente. | Rechazada para v1. |
| Monolito tradicional en capas | Simple. | Acoplamiento, difícil de modularizar después. | Rechazada. |
| Serverless | Bajo costo inicial. | Cold starts, límites, complejidad de colas y transacciones. | Rechazada. |
| **Monolito modular** | Transacciones simples, despliegue único, límites claros, extraíble. | Requiere disciplina de módulos. | **Elegida.** |

## Consecuencias

**Positivas**

- Transacciones ACID directas para agenda, caja y stock.
- Un solo pipeline de CI/CD y un solo entorno.
- Menor latencia y menos fallas de red.
- Refactorización temprana barata.

**Negativas / riesgos**

- El acoplamiento puede crecer si no se respetan los límites.
- El escalado es global, no por módulo.
- Un bug puede afectar a toda la aplicación.

**Mitigaciones**

- Reglas de dependencia y tests de arquitectura en CI.
- Esquemas separados y prohibición de *joins* entre módulos.
- Outbox para eventos; workers para lo pesado.
- Revisión de diseño en cada PR que cruce módulos.

## Criterios de revisión

Se reconsiderará extraer un servicio cuando ocurra al menos dos de estos:

1. Un módulo necesita escalar 10× más que el resto.
2. Un equipo distinto es dueño exclusivo del módulo.
3. El despliegue conjunto genera riesgo operativo medible.
4. Los límites del módulo son estables y sus transacciones, locales.
