# Estado de Implementación — SIGO-Dental

**Fecha de actualización:** 2026-10-30  
**Versión:** Full-Stack Completo (Backend Go 1.27 + Frontend React 19 + TypeScript + Docker)  
**Documento fuente:** SRS v1.0 (`docs/SRS/SRS-SIGO-Dental.md`)

---

## 1. Resumen Ejecutivo

El sistema SIGO-Dental cuenta con una implementación full-stack completa que cubre tanto el flujo operativo como los requerimientos clínicos avanzados del SRS:

- ✅ **Backend API REST en Go:** Arquitectura limpia con soporte dual para SQLite (desarrollo/local) y PostgreSQL (producción), autenticación JWT y control de acceso basado en roles (RBAC).
- ✅ **Frontend SPA en React 19 + TypeScript + Vite:** Interfaz moderna, accesible, responsive para escritorio y tablets en sillón odontológico.
- ✅ **Batería de Pruebas Automatizadas:** Tests en Go (`go test -v ./...`) cubriendo autenticación, presupuestos, prescripciones con alertas cruzadas de alergias, validación de menores y reportería.
- ✅ **Contenerización Docker:** `Dockerfile` multi-stage optimizado y `docker-compose.yml` listos para orquestación con PostgreSQL y Nginx.

---

## 2. Backend (Go) — Estado de Endpoints

### 2.1 Autenticación y Meta
| Endpoint | Método | Descripción | Rol Requerido |
|---|---|---|---|
| `/api/health` | GET | Healthcheck de la API | Público |
| `/api/auth/login` | POST | Login con emisión de JWT | Público |
| `/api/me` | GET | Perfil del usuario autenticado | Autenticado |
| `/api/meta` | GET | Catálogos iniciales (sedes, profesionales, sillones) | Autenticado |
| `/api/dashboard` | GET | Métricas y turnos del día | Autenticado |

### 2.2 Pacientes (RF-01, RF-02, RF-19, RN-08, RN-09)
| Endpoint | Método | Descripción | Rol Requerido |
|---|---|---|---|
| `/api/patients` | GET | Listado y búsqueda de pacientes activos | Autenticado |
| `/api/patients` | POST | Alta con validación de tutor legal para <18 años | Autenticado |
| `/api/patients/{id}` | GET | Detalle de paciente con historial y hallazgos | Autenticado |
| `/api/patients/{id}` | PUT | Edición de datos demográficos y cobertura | Autenticado |
| `/api/patients/{id}` | DELETE | **Baja lógica** (`active = false`, RN-09) | Admin |

### 2.3 Odontograma y Expediente Clínico (RF-03, RF-04, RF-05)
| Endpoint | Método | Descripción | Rol Requerido |
|---|---|---|---|
| `/api/patients/{id}/odontogram` | GET | Obtener hallazgos por pieza FDI | Autenticado |
| `/api/patients/{id}/odontogram/{tooth}` | PUT | Registrar condición y superficies | Admin/Odontólogo |
| `/api/patients/{id}/periodontal-exams` | GET/POST | Exámenes periodontales | Admin/Odontólogo |
| `/api/periodontal-exams/{examId}/measurements` | GET/POST | Mediciones periodontales (6 puntos, sangrado, cálculo) | Admin/Odontólogo |
| `/api/patients/{id}/soep-notes` | GET/POST | Notas clínicas de evolución SOEP (bloqueo 24h) | Admin/Odontólogo |

### 2.4 Recetas Digitales y Adjuntos (RF-20, RF-21)
| Endpoint | Método | Descripción | Rol Requerido |
|---|---|---|---|
| `/api/patients/{id}/prescriptions` | GET | Listar recetas médicas del paciente | Autenticado |
| `/api/patients/{id}/prescriptions` | POST | Emitir receta con **alerta cruzada de alergias** | Admin/Odontólogo |
| `/api/prescriptions/{id}/cancel` | POST | Anular receta con motivo y auditoría | Admin/Odontólogo |
| `/api/patients/{id}/attachments` | GET/POST | Radiografías, fotos clínicas y documentos | Autenticado |

### 2.5 Tratamientos y Presupuestos (RF-07, RF-08)
| Endpoint | Método | Descripción | Rol Requerido |
|---|---|---|---|
| `/api/patients/{id}/treatment-budgets` | GET/POST | Presupuestos de tratamiento | Autenticado |
| `/api/treatment-budgets/{budgetId}/items` | GET/POST | Ítems de presupuesto por fases | Admin/Odontólogo |
| `/api/treatment-items/{itemId}/approve` | POST | Aprobación de ítems individuales | Admin/Odontólogo |
| `/api/treatment-items/{itemId}/convert` | POST | **Conversión de ítem aprobado a turno agendado** | Autenticado |

### 2.6 Agenda y Citas (RF-09, RF-10)
| Endpoint | Método | Descripción | Rol Requerido |
|---|---|---|---|
| `/api/appointments` | GET | Listar citas por fecha y sede | Autenticado |
| `/api/appointments` | POST | Agendar cita (validación de sillón/profesional) | Autenticado |
| `/api/appointments/{id}` | PATCH | Transición de estado (`PROGRAMADA`, `CONFIRMADA`, etc.) | Autenticado |

### 2.7 Finanzas y Caja (RF-12, RF-13, RF-17, RN-02)
| Endpoint | Método | Descripción | Rol Requerido |
|---|---|---|---|
| `/api/payments` | GET/POST | Registro de cobros y pagos mixtos | Admin/Recepción |
| `/api/cash/count` | GET | Conteo de pagos para cierre de caja | Admin/Recepción |
| `/api/cash/close` | POST | **Cierre ciego de caja** (conteo físico previo) | Admin/Recepción |
| `/api/closures` | GET | Historial de cierres de caja | Autenticado |
| `/api/commissions` | GET | Liquidación de honorarios y comisiones | Admin |
| `/api/invoices` | GET/POST | Facturación y emisión con CAE simulado | Admin/Recepción |
| `/api/invoices/{id}/issue`| POST | Emisión fiscal de factura | Admin/Recepción |

### 2.8 Inventario (RF-14)
| Endpoint | Método | Descripción | Rol Requerido |
|---|---|---|---|
| `/api/inventory` | GET/POST | Catálogo de insumos y control de stock mínimo | Admin/Recepción |
| `/api/inventory/movements` | POST | Movimientos de stock (entrada, salida, ajuste) | Admin/Recepción |

### 2.9 Reportes y Gobierno (RF-18, RF-22)
| Endpoint | Método | Descripción | Rol Requerido |
|---|---|---|---|
| `/api/reports/summary` | GET | Resumen financiero, asistencias y producción profesional | Admin |
| `/api/audit` | GET | Bitácora inmutable de auditoría con filtros | Admin |
| `/api/users` | GET/POST | Administración de usuarios y roles | Admin |
| `/api/totp/status`, `/setup`, `/enable`, `/disable` | * | Gestión de autenticación en dos factores (MFA) | Autenticado |

---

## 3. Frontend (React) — Módulos y Páginas

| Página | Ruta | Descripción |
|---|---|---|
| **Login** | `/login` | Acceso con credenciales o selección de cuentas de demostración. |
| **Panel** | `/` | Indicadores operativos del día, alertas médicas críticas y accesos rápidos. |
| **Pacientes** | `/pacientes` | Búsqueda global tolerante, alta/edición con tutor legal y baja lógica. |
| **Ficha Paciente** | `/pacientes/:id` | Pestañas unificadas: Datos, Odontograma, Turnos, **Adjuntos y Rayos X**, **Recetas Digitales**. |
| **Agenda** | `/agenda` | Vista diaria multi-sillón con transiciones de estado de turno. |
| **Odontograma** | `/odontograma` | Odontograma anatómico interactivo FDI con selector dinámico de paciente. |
| **Periodontograma** | `/periodontograma` | Exámenes periodontales, sondaje en 6 sitios, sangrado (BOP) y cálculo. |
| **Notas SOEP** | `/soep` | Evolución clínica estructurada (S-O-E-P) y bloqueo por 24 horas. |
| **Consentimientos** | `/consentimientos` | Redacción de términos legales y firma digital de consentimientos informados. |
| **Presupuestos** | `/presupuestos` | Presupuestos por fases, aprobación de ítems y botón para agendar turnos. |
| **Caja** | `/caja` | Punto de venta, cobros con medios de pago y cierre ciego de caja. |
| **Facturación** | `/facturacion` | Comprobantes fiscales y facturación electrónica. |
| **Inventario** | `/inventario` | Insumos odontológicos, alertas de reposición y movimientos de stock. |
| **Comisiones** | `/comisiones` | Liquidación de honorarios por profesional. |
| **Reportes** | `/reportes` | Métricas operativas/financieras, producción por profesional y **exportación a CSV**. |
| **Notificaciones** | `/notificaciones` | Bandeja de recordatorios y confirmaciones. |
| **Auditoría** | `/auditoria` | Registro inmutable de eventos y cambios sobre datos sensibles. |
| **Usuarios** | `/usuarios` | Gestión del equipo y asignación de roles. |
| **Seguridad MFA** | `/mfa` | Configuración y verificación de TOTP de doble factor. |

---

## 4. Estado de Calidad y Pruebas

- **Backend (Go):**
  - Compilación limpia con `go build`.
  - Pruebas unitarias automatizadas (`go test -v ./...`) cubriendo autenticación, base de datos en memoria, ciclo de presupuestos, prescripciones médicas con control de alergias y reportes.
- **Frontend (TypeScript):**
  - Chequeo estricto de tipos con `tsc -b`.
  - Build de producción empaquetado exitosamente con `vite build` en ~250ms.
- **Docker:**
  - `server/Dockerfile` multi-stage con Alpine Linux y binario estático portable (`CGO_ENABLED=0`).
  - `web/Dockerfile` multi-stage con Nginx para servir la SPA de alto rendimiento.
