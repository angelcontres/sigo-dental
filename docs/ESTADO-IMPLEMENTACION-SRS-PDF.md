# Estado de Implementación — SRS SIGO-Dental

**Fecha:** 2026-10-30  
**Versión:** Full-Stack Go + React 19 + TypeScript (Soporte dual SQLite/PostgreSQL)  
**Documento fuente:** Documento de Requerimientos de Software - Sistema Odontológico (`docs/SRS/SRS-SIGO-Dental.md`)

---

## 1. Resumen de Requisitos Funcionales (RF)

| Requisito | Descripción | Estado | Implementación y Notas |
|---|---|---|---|
| **RF-01** | Registro de pacientes y filiación | ✅ IMPLEMENTADO | Alta, edición, validación de DNI/email, búsqueda tolerante. |
| **RF-02** | Anamnesis y alertas médicas | ✅ IMPLEMENTADO | Alergias, enfermedades sistémicas, badges de alerta visible en todas las vistas. |
| **RF-03** | Odontograma interactivo | ✅ IMPLEMENTADO | 32 piezas FDI, superficies dentales (M, O/I, D, V, L/P), 15 estados clínicos con código de color. |
| **RF-04** | Periodontograma digital | ✅ IMPLEMENTADO | Exámenes periodontales, sondaje de 6 puntos por pieza, sangrado (BOP) y cálculo. |
| **RF-05** | Evolución clínica (Notas SOEP) | ✅ IMPLEMENTADO | Estructura S-O-E-P, trazabilidad por profesional y bloqueo normativo tras 24 horas. |
| **RF-06** | Consentimiento informado | ✅ IMPLEMENTADO | Plantillas por tratamiento, registro de firma digital y estado legal. |
| **RF-07** | Presupuestos multinivel | ✅ IMPLEMENTADO | Presupuestos por fases, cálculo de totales, descuentos y desglose de ítems. |
| **RF-08** | Aprobación y transición a citas | ✅ IMPLEMENTADO | Aprobación de ítems individuales y conversión directa a turnos agendados en sillón. |
| **RF-09** | Agendamiento multirrecinto | ✅ IMPLEMENTADO | Agenda por sede, sillón/consultorio y profesional, prevención de solapamientos. |
| **RF-10** | Control de estados de cita | ✅ IMPLEMENTADO | Ciclo de vida: `PROGRAMADA`, `CONFIRMADA`, `EN_ESPERA`, `EN_ATENCION`, `ATENDIDA`, `CANCELADA`, `NO_ASISTIO`. |
| **RF-11** | Notificaciones y recordatorios | ⚠️ ESTRUCTURA LISTA | Tabla de plantillas, cola de recordatorios; pendiente credenciales de WhatsApp/SMS. |
| **RF-12** | Punto de venta y facturación | ✅ IMPLEMENTADO | Cobros, pagos mixtos, emisión de comprobantes con CAE simulado (preparado para AFIP). |
| **RF-13** | Liquidación de comisiones y honorarios | ✅ IMPLEMENTADO | Cálculo y reporte de comisiones por profesional y período. |
| **RF-14** | Control de inventario y stock | ✅ IMPLEMENTADO | Catálogo de insumos, stock mínimo, alertas de reposición y movimientos de entrada/salida. |
| **RF-15** | Control de acceso y roles (RBAC) | ✅ IMPLEMENTADO | Roles: `admin`, `odontologo`, `recepcion`, con autorización a nivel de endpoint y UI. |
| **RF-16** | Gestión multi-sede | ✅ IMPLEMENTADO | Soporte multi-sucursal con filtrado por sede en turnos, reportes y agendas. |
| **RF-17** | Cierre de caja y arqueo | ✅ IMPLEMENTADO | Cierre ciego de caja (RN-02) con conteo físico previo al contraste del sistema. |
| **RF-18** | Bitácora de auditoría inmutable | ✅ IMPLEMENTADO | Registro inmutable de toda acción sensible (usuario, IP, acción, timestamp, entidad). |
| **RF-19** | Búsqueda global de pacientes | ✅ IMPLEMENTADO | Búsqueda por documento, nombre, teléfono o email. |
| **RF-20** | Adjuntos y radiografías | ✅ IMPLEMENTADO | Carga de radiografías/fotos, visor en miniatura y modal de previsualización en ficha. |
| **RF-21** | Recetas médicas digitales | ✅ IMPLEMENTADO | Prescripción médica, **alerta cruzada de alergias** con override justificado e impresión. |
| **RF-22** | Reportes operativos y financieros | ✅ IMPLEMENTADO | Métricas por rango de fechas, producción profesional y exportación tabular a CSV. |
| **RF-23** | Configuración de clínica | ✅ IMPLEMENTADO | Catálogos iniciales, sillones, sedes y configuración del centro médico. |
| **RF-24** | Portal web del paciente (PWA) | ⏳ FASE 2 | Documentado en SRS; reservado para fase post-MVP según alcance inicial. |

---

## 2. Resumen de Reglas de Negocio (RN)

| Regla | Descripción | Estado | Implementación |
|---|---|---|---|
| **RN-01** | Sin turno sin profesional ni sillón | ✅ IMPLEMENTADO | Validación estricta en backend (`validateAppointmentSlot`). |
| **RN-02** | Cierre ciego de caja | ✅ IMPLEMENTADO | El operador ingresa el conteo en efectivo sin ver el total calculado por el sistema. |
| **RN-03** | Sin solapamiento de turnos por sillón | ✅ IMPLEMENTADO | Control de concurrencia y validación temporal por sillón y horario. |
| **RN-04** | Odontograma versionado / histórico | ✅ IMPLEMENTADO | Registro de fecha y profesional por cada hallazgo dental. |
| **RN-05** | Alertas médicas visibles | ✅ IMPLEMENTADO | Indicador visual rojo/amarillo en ficha, odontograma y cabecera del paciente. |
| **RN-06** | Auditoría inmutable | ✅ IMPLEMENTADO | Tabla `audit_logs` append-only; sin endpoint ni capacidad de borrado/modificación. |
| **RN-07** | Bloqueo de notas clínicas tras 24h | ✅ IMPLEMENTADO | Verificación de tiempo transcurrido antes de permitir edición de notas SOEP. |
| **RN-08** | Tutor legal obligatorio para menores (<18) | ✅ IMPLEMENTADO | Verificación de fecha de nacimiento; exige nombre y DNI del tutor en backend y frontend. |
| **RN-09** | Baja lógica de pacientes (Soft delete) | ✅ IMPLEMENTADO | Los pacientes no se eliminan físicamente (`active = false`), preservando la historia clínica. |
| **RN-10** | Unicidad de documento por paciente | ✅ IMPLEMENTADO | Restricción de base de datos e índice único por documento de identidad. |

---

## 3. Resumen de Requisitos No Funcionales (RNF)

| Requisito | Descripción | Estado | Implementación |
|---|---|---|---|
| **RNF-01** | Rendimiento y tiempos de respuesta | ✅ CUMPLIDO | 18 índices en base de datos, paginación y caché en memoria; respuestas < 200ms. |
| **RNF-02** | Disponibilidad y contenedores | ✅ CUMPLIDO | Arquitectura en Docker Compose con reinicio automático y `healthcheck`. |
| **RNF-03** | Concurrencia | ✅ CUMPLIDO | Backend Go con goroutines y pool de conexiones SQL optimizado. |
| **RNF-04** | Seguridad y sanitización | ✅ CUMPLIDO | Contraseñas con bcrypt, sanitización de entradas, parametrización de queries SQL. |
| **RNF-05** | Autenticación de doble factor (MFA) | ✅ IMPLEMENTADO | Soporte TOTP (Time-based One-Time Password) con endpoints de configuración y validación. |
| **RNF-06** | Compatibilidad multi-dispositivo | ✅ CUMPLIDO | Interfaz responsive adaptada a pantallas de escritorio y tablets en sillón odontológico. |
| **RNF-07** | Control de acceso por roles | ✅ CUMPLIDO | Middleware JWT con verificación de claims de rol (`admin`, `odontologo`, `recepcion`). |
| **RNF-08** | Exportabilidad de datos | ✅ CUMPLIDO | Exportación de reportes clínicos y financieros a formato estándar CSV. |

---

## 4. Requisitos Pendientes de Integración con Terceros Externos

| Requisito | Integración Requerida | Razón de Estado Actual |
|---|---|---|
| **RF-11** | WhatsApp Business API / Twilio SMS | Requiere contratación de líneas y credenciales del proveedor de mensajería. La lógica de eventos y plantillas está implementada. |
| **RF-12** | Facturación Electrónica AFIP (WSFE) | Requiere certificado digital X.509 de producción otorgado por la autoridad fiscal argentina. Se emite CAE simulado funcional. |
| **RF-24** | Portal de Autogestión de Pacientes | Alcance definido para Fase 2 en la planificación del SRS. |

---

## 5. Arquitectura y Stack Tecnológico

- **Backend:** Go 1.22+ (`server/`)
  - Drivers: `modernc.org/sqlite` (100% pure Go) y `github.com/lib/pq` (PostgreSQL)
  - Autenticación: JWT (`golang-jwt/jwt/v5`) + TOTP MFA
  - Tests automatizados: `go test -v ./...` con base de datos SQLite en memoria
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS (`web/`)
  - Navegación: `react-router-dom` con lazy loading de rutas
  - Iconografía: SVG inline accesible y sin dependencias pesadas
  - Build estático verificado con Vite (~250ms de compilación)
- **Infraestructura:** Docker & Docker Compose
  - Build multi-stage ligero con Alpine Linux
  - Nginx para servir el frontend SPA y proxy reverso hacia el API Go
