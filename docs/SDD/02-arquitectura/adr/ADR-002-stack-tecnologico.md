# ADR-002 · Stack tecnológico

- **Estado:** Propuesto
- **Fecha:** 2026-10-29
- **Decisores:** Arquitectura, TI Lead
- **Relacionados:** ADR-001, SRS RNF-16, RNF-21

---

## Contexto

Se necesita un stack productivo, con tipado fuerte de punta a punta, buen ecosistema para
formularios complejos (odontograma, agenda), generación de PDF, colas y pruebas. El equipo
trabaja principalmente con TypeScript. El sistema debe ser desplegable en contenedores y
soportar OpenAPI.

## Decisión

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui + Radix |
| Estado/cliente HTTP | TanStack Query + React Hook Form + Zod |
| Backend | Node.js 22 + NestJS 11 (TypeScript) |
| ORM / migraciones | Prisma |
| Base de datos | PostgreSQL 16 |
| Caché / colas | Redis 7 + BullMQ |
| Archivos | S3 (MinIO en desarrollo) |
| PDF | Playwright/Chromium headless o `pdf-lib` |
| Autenticación | JWT + refresh rotativo + TOTP |
| Pruebas | Vitest, Supertest, Playwright, k6 |
| CI/CD | GitHub Actions + Docker |
| Observabilidad | OpenTelemetry + Prometheus + Grafana + Loki + Sentry |

## Alternativas consideradas

| Área | Alternativa | Motivo del rechazo |
|---|---|---|
| Frontend | Angular | Curva más alta y ecosistema de componentes menos flexible para el odontograma. |
| Frontend | Vue | Viable, pero el equipo tiene más experiencia en React. |
| Backend | Django / Laravel | Buenas opciones; se pierde el tipado compartido con el frontend. |
| Backend | .NET | Sólido, pero el equipo es TypeScript. |
| ORM | TypeORM / Drizzle | Prisma ofrece migraciones y tipado más maduros para este equipo. |
| DB | MySQL | PostgreSQL aporta mejor soporte JSONB, RLS, índices y extensiones. |
| Archivos | Guardar en DB | Mala performance y backups pesados. |

## Consecuencias

**Positivas**

- Un solo lenguaje (TypeScript) en frontend, backend y pruebas E2E.
- OpenAPI generado desde NestJS y cliente tipado.
- Ecosistema amplio para PDF, colas y validación.
- Contenedores simples y despliegue estándar.

**Negativas / riesgos**

- Prisma limita consultas muy complejas; se podrá usar SQL crudo en reportes.
- Node.js requiere cuidado con CPU intensiva (PDF): se resuelve en workers.
- Dependencia de ecosistema npm: se mitiga con lockfile y auditoría de dependencias.

## Criterios de revisión

- Si el rendimiento de reportes complejos no cumple, se evalúa un motor analítico o vistas
  materializadas.
- Si el volumen de PDF/worker crece, se separan workers dedicados.
