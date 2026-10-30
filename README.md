# SIGO-Dental

**Sistema Integral de Gestión Odontológica y Expediente Clínico Digital**

> Estado: **Fase 1 documentada + MVP funcional de 1 hora**. La documentación describe el
> sistema completo; el prototipo que se puede abrir hoy implementa un corte vertical
> (pacientes → agenda → odontograma → caja → panel).

---

## 1. Qué es SIGO-Dental

Plataforma web (responsive, apta para tablet en sillón odontológico) para la operación
clínica y administrativa de clínicas odontológicas. El alcance completo documentado incluye:

- Expediente clínico digital único, con alertas médicas visibles.
- Odontograma interactivo (dentición permanente y decidua, notación FDI y Universal).
- Periodontograma, notas de evolución SOEP, consentimientos y recetas.
- Agenda de citas por sede, consultorio/sillón y profesional.
- Presupuestos por fases, planes de tratamiento y su vínculo con la agenda.
- Facturación, caja, pagos mixtos, liquidación de honorarios y control de inventario.
- Auditoría inmutable y trazabilidad de todo acceso a datos clínicos.

El detalle normativo está en el [SRS](docs/SRS/SRS-SIGO-Dental.md). El diseño está en el
[SDD](docs/SDD/README.md).

---

## 2. MVP en una hora

Prototipo estático, sin instalación ni backend, con persistencia en `localStorage`.

### Cómo ejecutarlo

1. Abrir `app/index.html` con doble clic (Chrome, Edge o Firefox).
2. Usar el botón **Reiniciar demo** para volver a los datos de ejemplo.

No requiere servidor, build ni conexión a internet.

### Qué se puede mostrar

| Módulo | Funcionalidad |
|---|---|
| **Panel** | Pacientes, turnos de hoy, cobrado y alertas médicas. |
| **Pacientes** | Alta, edición, búsqueda, edad y alertas; acceso a agenda y odontograma. |
| **Agenda** | Turnos por fecha con estados: programada, confirmada, en sala, atendida, cancelada. |
| **Odontograma** | 32 dientes FDI, 7 condiciones, superficies, nota por pieza y guardado automático. |
| **Caja** | Cobros con medio de pago, total del día y cierre de caja. |

Alcance, plan de 60 minutos, guion de demo y limitaciones:
[`docs/MVP-1-HORA.md`](docs/MVP-1-HORA.md).

### Verificación realizada

El MVP se ejecutó en Chrome headless con 13 comprobaciones automatizadas: carga inicial,
alta de paciente, rechazo de documento duplicado, alta de turno, conflicto de horario,
cambio de estado, guardado y borrado de hallazgo, registro de cobro, cierre de caja,
persistencia tras recargar, reinicio de demo y ausencia de errores de consola.

---

## 3. Documentación

| Documento | Descripción |
|---|---|
| [Índice de documentación](docs/README.md) | Mapa completo, convenciones y estado de cada documento. |
| [MVP 1 hora](docs/MVP-1-HORA.md) | Alcance real del prototipo, plan de 60 min y guion de demo. |
| [SRS](docs/SRS/SRS-SIGO-Dental.md) | Especificación de requisitos de software (funcionales, no funcionales, reglas de negocio e interfaces). |
| [Casos de uso](docs/SRS/A-casos-de-uso.md) | Especificación detallada de los flujos críticos. |
| [Matriz de trazabilidad](docs/SRS/B-matriz-trazabilidad.md) | Requisito → caso de uso → módulo de diseño → prueba → fase. |
| [Catálogo de requisitos](docs/SRS/C-catalogo-requisitos.csv) | Requisitos en formato tabular para importar a una herramienta de gestión. |
| [SDD](docs/SDD/README.md) | Software Design Document dividido por dominios. |
| [Glosario](docs/GLOSARIO.md) | Vocabulario clínico, administrativo y técnico. |
| [Plan de levantamiento](docs/levantamiento/PLAN-LEVANTAMIENTO.md) | Cómo se relevan y validan los requisitos con la clínica. |
| [Preguntas abiertas](docs/levantamiento/PREGUNTAS-ABIERTAS.md) | Decisiones pendientes que bloquean o condicionan el diseño. |

---

## 4. Stack

### 4.1 MVP actual

| Capa | Tecnología | Nota |
|---|---|---|
| Interfaz | HTML + CSS + JavaScript vanilla | Sin dependencias ni build. |
| Persistencia | `localStorage` (`sigo_mvp_v1`) | Datos locales del navegador. |
| Ejecución | Doble clic en `app/index.html` | Sin servidor. |

### 4.2 Stack objetivo (documentado, no implementado)

| Capa | Tecnología | Nota |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui | SPA responsive; PWA en Fase 2. |
| Backend | NestJS (Node.js 22, TypeScript), monolito modular | Módulos alineados a los *bounded contexts* del SDD. |
| Base de datos | PostgreSQL 16 | Transaccional, con extensiones para búsqueda. |
| Caché y colas | Redis 7 + BullMQ | Sesiones, *rate limiting*, jobs de notificación. |
| Archivos | S3 compatible (MinIO en desarrollo) | Radiografías, fotos, PDFs firmados. |
| Autenticación | JWT + refresh rotativo + TOTP (MFA) | RBAC por rol y sede. |
| Infraestructura | Docker, Nginx, GitHub Actions | Dev / staging / producción. |
| Observabilidad | OpenTelemetry, Prometheus, Grafana, Loki, Sentry | SLOs y alertas. |

Las decisiones y sus alternativas están registradas como ADR en
[`docs/SDD/02-arquitectura/adr/`](docs/SDD/02-arquitectura/adr/).

---

## 5. Estructura del repositorio

```text
proyecto_odontologo/
├── README.md                  # Este archivo
├── docs/
│   ├── README.md              # Índice y gobernanza documental
│   ├── MVP-1-HORA.md          # Alcance y guion del prototipo
│   ├── GLOSARIO.md
│   ├── levantamiento/         # Artefactos de Fase 1
│   ├── SRS/                   # Especificación de requisitos
│   ├── SDD/                   # Diseño del software por dominio
│   └── plantillas/            # Plantillas reutilizables
└── app/                       # MVP funcional
    ├── index.html
    ├── styles.css
    └── app.js
```

---

## 6. Hoja de ruta

| Fase | Alcance | Estado |
|---|---|---|
| **MVP** | Prototipo de 1 hora: pacientes, agenda, odontograma, caja, panel | Completado |
| **Fase 1** | Levantamiento, SRS, SDD | Completado |
| Fase 2 (E1) | Núcleo administrativo sobre API y base de datos (Sprints 1–4) | Pendiente |
| Fase 3 (E2) | Núcleo clínico completo: periodontograma, SOEP, consentimientos (Sprints 5–8) | Pendiente |
| Fase 4 (E3) | Finanzas avanzadas, inventario, reportes (Sprints 9–11) | Pendiente |
| Fase 5 (E4) | UAT, auditoría de seguridad y salida a producción (Sprint 12) | Pendiente |

> `E1`–`E4` son las etapas de entrega del software definidas en el SRS. El detalle está en
> [PLAN-ENTREGA](docs/SDD/11-plan-entrega/PLAN-ENTREGA.md). La evolución del MVP hacia esa
> arquitectura está resumida en [`docs/MVP-1-HORA.md`](docs/MVP-1-HORA.md).

---

## 7. Modo de trabajo

Este proyecto se construyó como prototipo rápido: **no hay stakeholders formales, comité,
firmas ni actas de aprobación**. Los documentos son vivos y se actualizan junto con el
código.

1. Todo cambio de alcance se registra en `docs/MVP-1-HORA.md` y, si aplica, en el SRS.
2. Las decisiones de arquitectura del sistema completo se registran como ADR.
3. Los identificadores (`RF-xx`, `RNF-xx`, `RN-xx`, `UC-xx`, `ADR-xxx`) son estables.
4. El prototipo prioriza **mostrar el flujo**, no cumplir el SRS completo.

---

## 8. Referencias

- Documento fuente: `Documento de Requerimientos de Software - Sistema Odontológico.md.pdf`
  (v1.0, 29/10/2026).
- ISO/IEC/IEEE 29148:2018 — Ingeniería de requisitos.
- ISO/IEC/IEEE 42010:2022 — Descripción de arquitecturas.
- OWASP ASVS 5.0 / OWASP Top 10.
- WCAG 2.2 nivel AA.
