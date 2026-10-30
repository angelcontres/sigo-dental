# SIGO-Dental

**Sistema Integral de Gestión Odontológica y Expediente Clínico Digital**

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org)
[![React Version](https://img.shields.io/badge/React-19.0+-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Docker Ready](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://www.docker.com)
[![Tests](https://img.shields.io/badge/Tests-Passing-success)](file:///server/server_test.go)

SIGO-Dental es una plataforma web completa, modular y adaptada para tabletas en sillón odontológico y estaciones de recepción. Cubre el ciclo clínico completo del paciente (filiación, odontograma interactivo, periodontograma, evolución SOEP, consentimientos, presupuestos, recetas y radiografías) junto con la gestión administrativa (agenda multirrecinto, caja ciega, liquidación de comisiones, inventario, reportes y auditoría inmutable).

---

## 1. Módulos y Funcionalidades Principales

### 🩺 Gestión Clínica
- **Expediente Único y Alertas Médicas (RF-01, RF-02):** Historial médico centralizado, badges de alerta para alergias y patologías sistémicas visibles en cada sección.
- **Tutor Legal para Menores (RN-08):** Validación estricta que exige nombre y DNI del tutor cuando la edad del paciente es menor a 18 años.
- **Baja Lógica / Soft Delete (RN-09):** Eliminación lógica (`active = false`) que previene pérdida de antecedentes clínicos y garantiza trazabilidad médica legal.
- **Odontograma Anatómico FDI (RF-03):** Marcado interactivo por pieza (32 dientes) y caras dentales (M, O/I, D, V, L/P) con 15 condiciones clínicas identificadas por color.
- **Periodontograma Digital (RF-04):** Sondaje periodontal de 6 puntos por pieza, registro de sangrado al sondaje (BOP) y cálculo.
- **Notas de Evolución SOEP (RF-05, RN-07):** Registro estructurado (Subjetivo, Objetivo, Evaluación, Plan) con bloqueo normativo de edición tras 24 horas.
- **Consentimientos Informados (RF-06):** Plantillas de procedimientos con registro de firma digital del paciente.
- **Presupuestos y Conversión a Turnos (RF-07, RF-08):** Presupuestos por fases con aprobación de ítems individuales y conversión directa de ítems aprobados a turnos agendados.
- **Recetas Médicas Digitales (RF-21, RN-05):** Emisión de prescripciones con **alerta cruzada de alergias** del paciente, anulación auditada y formato para impresión.
- **Adjuntos y Radiografías (RF-20):** Carga y visualización en miniatura de radiografías periapicales, panorámicas y fotos intraorales en la ficha del paciente.

### 💼 Gestión Administrativa y Financiera
- **Agenda Multirrecinto (RF-09, RF-10):** Agendamiento por sede, consultorio/sillón y odontólogo; prevención de solapamientos (RN-01, RN-03) y estados de cita (`PROGRAMADA`, `CONFIRMADA`, `EN_ESPERA`, `EN_ATENCION`, `ATENDIDA`, `CANCELADA`, `NO_ASISTIO`).
- **Caja y Cierre Ciego (RF-12, RF-17, RN-02):** Cobros, pagos combinados (efectivo, tarjeta, transferencia) y arqueo ciego donde el operador debe ingresar el efectivo físico sin conocer de antemano el cálculo del sistema.
- **Liquidación de Comisiones (RF-13):** Registro y cálculo de honorarios profesionales por prestación.
- **Control de Inventario (RF-14):** Catálogo de insumos odontológicos, control de stock mínimo con alertas visuales y registro de entradas y salidas.
- **Reportes Operativos y Financieros (RF-22):** Métricas de facturación, tasa de no-show, producción por odontólogo y exportación a formato **CSV**.
- **Seguridad, Roles y Auditoría (RF-15, RF-18, RNF-05, RN-06):** Control de acceso por roles (`admin`, `odontologo`, `recepcion`), autenticación en dos pasos (TOTP / MFA) y bitácora inmutable de auditoría.

---

## 2. Arquitectura y Stack Tecnológico

```
┌────────────────────────────────────────────────────────┐
│               Frontend (web/)                         │
│  React 19 + TypeScript + Vite + Tailwind CSS           │
│  SPA Responsive (Desktop / Tablet en Sillón)           │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / REST (JWT Bearer)
┌──────────────────────────▼─────────────────────────────┐
│               Backend (server/)                        │
│  Go (Golang) 1.22+ Standard HTTP & Goroutines          │
│  JWT Auth + TOTP MFA + RBAC Middleware                 │
└──────────────────────────┬─────────────────────────────┘
                           │ Pure Go SQL Driver
┌──────────────────────────▼─────────────────────────────┐
│               Capa de Datos                            │
│  SQLite (modernc.org/sqlite - Desarrollo Local Zero-Config)│
│  PostgreSQL (github.com/lib/pq - Producción Escalable) │
└────────────────────────────────────────────────────────┘
```

- **Backend:** Go 1.22+ con arquitectura monolítica limpia y modular, sin dependencias CGO (`CGO_ENABLED=0`), compatible con SQLite y PostgreSQL con detección automática.
- **Frontend:** React 19 + TypeScript con Vite para bundling instantáneo, Tailwind CSS para estilos y SVG accesibles sin librerías pesadas.
- **Persistencia y Despliegue:** Soporte Docker multi-stage optimizado sobre Alpine Linux y Nginx.
- **Prototipo Rápido Offline:** Incluye prototipo HTML/JS vanilla en [`app/index.html`](file:///app/index.html) para pruebas sin backend.

---

## 3. Puesta en Marcha (Quick Start)

### Opción A: Con Docker Compose (Recomendado)

Requiere [Docker](https://www.docker.com/) y [Docker Compose](https://docs.docker.com/compose/).

```bash
# Iniciar frontend, backend y base de datos
docker compose up -d --build

# Ver logs del sistema
docker compose logs -f
```

- **Frontend:** Abre [http://localhost:3000](http://localhost:3000)
- **API Backend:** Disponible en [http://localhost:8080/api](http://localhost:8080/api)

---

### Opción B: Desarrollo Local (Sin Docker)

#### Requisitos previos
- [Go 1.22+](https://go.dev/dl/) instalado.
- [Node.js 18+](https://nodejs.org/) y npm instalados.

#### 1. Iniciar el Backend (Go)
```bash
cd server
go run .
```
> El servidor inicializará automáticamente la base de datos SQLite (`sigo.db`) con las tablas e índices necesarios, precargando datos semilla si la base está vacía. Escuchará en `http://localhost:8080`.

#### 2. Iniciar el Frontend (React)
En otra terminal:
```bash
cd web
npm install
npm run dev
```
> La interfaz estará disponible en [http://localhost:5173](http://localhost:5173) y conectará automáticamente con el backend en el puerto 8080.

---

## 4. Credenciales de Demostración

El sistema incluye usuarios preconfigurados para explorar los distintos roles del sistema:

| Rol | Correo Electrónico | Contraseña | Capacidades |
|---|---|---|---|
| **Administrador** | `admin@sigo.local` | `admin123` | Acceso completo: reportes, auditoría, usuarios, caja, clínica. |
| **Odontólogo** | `odontologo@sigo.local` | `odontologo123` | Acceso clínico: ficha, odontograma, periodonto, SOEP, recetas. |
| **Recepción** | `recepcion@sigo.local` | `recepcion123` | Acceso operativo: agenda, alta de pacientes, cobros, caja. |

---

## 5. Pruebas y Control de Calidad

El proyecto cuenta con verificación automatizada de extremo a extremo:

### Pruebas Unitarias del Backend
```bash
cd server
go test -v ./...
```
Ejecuta la suite en memoria que valida:
- Autenticación y generación de JWT.
- Ciclo de presupuestos y conversión de tratamientos a turnos.
- Recetas médicas y **validación cruzada de alergias**.
- Regla de negocio de tutor para menores (RN-08) y baja lógica (RN-09).
- Cálculo y agregación de reportes operativos.

### Chequeo de Tipos y Build del Frontend
```bash
cd web
npm run build
```
Valida que no existan errores de TypeScript y empaqueta los assets de producción con Vite.

---

## 6. Estructura del Proyecto

```text
proyecto_odontologo/
├── docker-compose.yml         # Definición de servicios para despliegue
├── server/                    # Backend en Go
│   ├── main.go                # Inicialización, DDL, índices y migraciones
│   ├── handlers.go            # Controladores REST, RBAC y lógica de negocio
│   ├── server_test.go         # Batería de pruebas unitarias
│   ├── go.mod / go.sum        # Dependencias de Go
│   └── Dockerfile             # Imagen Docker multi-stage estática
├── web/                       # Frontend en React 19 + TypeScript
│   ├── src/
│   │   ├── pages/             # 17 páginas (Pacientes, Odontograma, Presupuestos, etc.)
│   │   ├── components/        # Componentes UI (PatientForm, etc.)
│   │   ├── icons.tsx          # Iconos SVG nativos y accesibles
│   │   ├── api.ts             # Cliente HTTP con interceptor JWT
│   │   └── Layout.tsx         # Navegación principal y control de sesión
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile             # Imagen Nginx para producción
├── app/                       # MVP estático inicial en HTML/JS vanilla
└── docs/                      # Documentación de ingeniería de software
    ├── README.md              # Índice maestro de documentación
    ├── ESTADO-IMPLEMENTACION.md # Detalle exhaustivo de endpoints y componentes
    ├── ESTADO-IMPLEMENTACION-SRS-PDF.md # Matriz de cumplimiento contra el SRS
    ├── SRS/                   # Especificación de requisitos de software (SRS)
    └── SDD/                   # Documento de diseño de software (SDD)
```

---

## 7. Documentación Técnica

Para conocer los detalles metodológicos, normativos y de arquitectura:
- [Estado Detallado de Implementación](docs/ESTADO-IMPLEMENTACION.md)
- [Matriz de Cumplimiento de Requisitos SRS](docs/ESTADO-IMPLEMENTACION-SRS-PDF.md)
- [Especificación de Requisitos (SRS)](docs/SRS/SRS-SIGO-Dental.md)
- [Diseño de Arquitectura y ADRs (SDD)](docs/SDD/README.md)
- [Catálogo Tabular de Requisitos](docs/SRS/C-catalogo-requisitos.csv)
- [Glosario](docs/GLOSARIO.md)

---

## 8. Licencia

Este proyecto está disponible bajo los términos y condiciones definidos para el desarrollo de SIGO-Dental.
