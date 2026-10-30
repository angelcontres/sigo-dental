# Documentación — SIGO-Dental

Índice maestro de la documentación del **Sistema Integral de Gestión Odontológica y Expediente Clínico Digital**.

- **Etapa:** Full-Stack Implementado (Backend Go + Frontend React 19 + Docker).
- **Versión del conjunto documental:** `v1.0.0`.
- **Fecha de corte:** 2026-10-30.
- **Idioma:** español (código y nombres técnicos en inglés cuando corresponda).

---

## 1. Mapa de documentos

### 1.0 Estado de la Implementación

| Documento | Ruta | Estado | Descripción |
|---|---|---|---|
| **Estado de Implementación** | [`ESTADO-IMPLEMENTACION.md`](ESTADO-IMPLEMENTACION.md) | **Vigente** | Estado técnico detallado de endpoints Go, componentes React y pruebas. |
| **Matriz de Requisitos SRS** | [`ESTADO-IMPLEMENTACION-SRS-PDF.md`](ESTADO-IMPLEMENTACION-SRS-PDF.md) | **Vigente** | Mapeo de RF, RN y RNF del documento SRS contra la solución construida. |
| **Alcance y Guion MVP 1h** | [`MVP-1-HORA.md`](MVP-1-HORA.md) | Histórico / Vigente | Prototipo estático inicial (HTML/JS sin backend) conservado en `app/`. |

### 1.1 Requisitos del Sistema

| Documento | Ruta | Estado |
|---|---|---|
| SRS (especificación principal) | [`SRS/SRS-SIGO-Dental.md`](SRS/SRS-SIGO-Dental.md) | Vigente (referencia) |
| Casos de uso detallados | [`SRS/A-casos-de-uso.md`](SRS/A-casos-de-uso.md) | Vigente |
| Matriz de trazabilidad | [`SRS/B-matriz-trazabilidad.md`](SRS/B-matriz-trazabilidad.md) | Vigente |
| Catálogo tabular de requisitos | [`SRS/C-catalogo-requisitos.csv`](SRS/C-catalogo-requisitos.csv) | Actualizado con estados de implementación |
| Glosario clínico y técnico | [`GLOSARIO.md`](GLOSARIO.md) | Vigente |

### 1.2 Levantamiento y Metodología

| Documento | Ruta | Estado |
|---|---|---|
| Plan de levantamiento | [`levantamiento/PLAN-LEVANTAMIENTO.md`](levantamiento/PLAN-LEVANTAMIENTO.md) | Referencia |
| Preguntas y decisiones abiertas | [`levantamiento/PREGUNTAS-ABIERTAS.md`](levantamiento/PREGUNTAS-ABIERTAS.md) | Referencia |
| Plantilla de entrevista | [`plantillas/entrevista.md`](plantillas/entrevista.md) | Reutilizable |
| Plantilla de historia de usuario | [`plantillas/historia-usuario.md`](plantillas/historia-usuario.md) | Reutilizable |
| Plantilla de acta de reunión | [`plantillas/acta-reunion.md`](plantillas/acta-reunion.md) | Reutilizable |

### 1.3 Diseño de Software (SDD)

El SDD está dividido por dominio; cada carpeta contiene un documento autónomo y legible.
El índice detallado, con dependencias y estado, está en [`SDD/README.md`](SDD/README.md).

| # | Dominio | Ruta |
|---|---|---|
| 01 | Visión y alcance del diseño | [`SDD/01-vision-alcance/DESIGN-VISION.md`](SDD/01-vision-alcance/DESIGN-VISION.md) |
| 02 | Arquitectura y ADR | [`SDD/02-arquitectura/ARQUITECTURA.md`](SDD/02-arquitectura/ARQUITECTURA.md) |
| 03 | Modelo de datos | [`SDD/03-modelo-datos/MODELO-DATOS.md`](SDD/03-modelo-datos/MODELO-DATOS.md) |
| 04 | Diseño funcional por módulo | [`SDD/04-diseno-funcional/`](SDD/04-diseno-funcional/) |
| 05 | Contratos de API e integraciones | [`SDD/05-apis/API-CONTRATOS.md`](SDD/05-apis/API-CONTRATOS.md) |
| 06 | Seguridad y privacidad | [`SDD/06-seguridad/SEGURIDAD.md`](SDD/06-seguridad/SEGURIDAD.md) |
| 07 | Infraestructura y DevOps | [`SDD/07-infraestructura/INFRAESTRUCTURA-DEVOPS.md`](SDD/07-infraestructura/INFRAESTRUCTURA-DEVOPS.md) |
| 08 | UI/UX y design system | [`SDD/08-ui-ux/UI-UX.md`](SDD/08-ui-ux/UI-UX.md) |
| 09 | Pruebas y calidad | [`SDD/09-pruebas/PLAN-PRUEBAS.md`](SDD/09-pruebas/PLAN-PRUEBAS.md) |
| 10 | Operaciones y soporte | [`SDD/10-operaciones/OPERACIONES.md`](SDD/10-operaciones/OPERACIONES.md) |
| 11 | Plan de entrega y riesgos | [`SDD/11-plan-entrega/PLAN-ENTREGA.md`](SDD/11-plan-entrega/PLAN-ENTREGA.md) |

---

## 2. Convenciones documentales

### 2.1 Identificadores

| Prefijo | Significado | Ejemplo |
|---|---|---|
| `RF-xx` | Requisito funcional | `RF-03` |
| `RNF-xx` | Requisito no funcional | `RNF-04` |
| `RN-xx` | Regla de negocio | `RN-01` |
| `UC-xx` | Caso de uso | `UC-05` |
| `HU-xx` | Historia de usuario | `HU-12` |
| `ADR-xxx` | Architecture Decision Record | `ADR-002` |
| `MD-xx` | Módulo de diseño | `MD-03` |
| `TP-xx` | Caso de prueba (test plan) | `TP-14` |
| `Q-xx` | Pregunta abierta | `Q-07` |
| `R-xx` | Riesgo | `R-03` |

Los identificadores son **inmutables**: si un requisito se elimina, se marca como
`Retirado` y su número no se vuelve a usar.

### 2.2 Estados de un documento

| Estado | Significado |
|---|---|
| `Borrador` | En elaboración; puede cambiar sin aviso. |
| `En revisión` | Congelado para revisión. |
| `Vigente` | Alineado con la plataforma implementada. |
| `Obsoleto` | Reemplazado por otro documento (se indica cuál). |

---

## 3. Arquitectura del Repositorio

```text
proyecto_odontologo/
├── README.md                  # Presentación principal, quickstart y stack
├── docker-compose.yml         # Orquestación de desarrollo y producción
├── server/                    # Backend en Go (REST API, SQLite/PostgreSQL)
│   ├── main.go                # Entrada del servidor y configuración de BD
│   ├── handlers.go            # Endpoints y lógica de negocio
│   ├── server_test.go         # Batería de pruebas unitarias automatizadas
│   └── Dockerfile             # Multi-stage build estático (CGO_ENABLED=0)
├── web/                       # Frontend SPA en React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── pages/             # 17 vistas clínicas y operativas
│   │   ├── components/        # Componentes reutilizables y modales
│   │   └── api.ts             # Cliente HTTP tipado
│   └── Dockerfile             # Multi-stage build con Nginx
├── app/                       # MVP estático inicial (HTML/JS vanilla)
└── docs/                      # Especificación técnica, SRS y SDD
```
