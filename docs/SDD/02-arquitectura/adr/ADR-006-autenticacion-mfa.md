# ADR-006 · Autenticación y MFA

- **Estado:** Propuesto
- **Fecha:** 2026-10-29
- **Decisores:** Arquitectura, Seguridad, TI
- **Relacionados:** RF-15, RNF-06, RNF-10

---

## Contexto

El sistema expone datos clínicos y financieros. Se exige RBAC, MFA obligatoria para roles
clínicos y financieros, bloqueo por intentos fallidos y cierre de sesión por inactividad
(15 min). El equipo es pequeño y no hay un proveedor de identidad corporativo.

## Decisión

Implementar autenticación **propia** dentro del módulo `Auth & Identity`:

- Contraseñas con **Argon2id** (parámetros configurables, mínimo 12 caracteres).
- **JWT de acceso** de 15 minutos + **refresh token rotativo** de 8 horas, almacenado como
  hash en base de datos y asociado a dispositivo.
- **MFA TOTP** obligatoria para roles `ODONTOLOGO`, `ADMIN`, `AUDITOR` y `CAJERO`
  (configurable por rol); códigos de recuperación de un solo uso.
- **Bloqueo** tras 5 intentos fallidos durante 15 minutos; desbloqueo administrativo.
- **Sesión inactiva**: el frontend cierra a los 15 min; el backend rechaza refresh vencido.
- **RBAC** con permisos `recurso:acción` y verificación en guard + caso de uso.
- **Auditoría** de login, logout, MFA, cambios de contraseña y accesos denegados.
- **Rate limiting** por IP y por usuario en endpoints de autenticación.

## Alternativas consideradas

| Alternativa | Pros | Contras | Veredicto |
|---|---|---|---|
| Keycloak | Estándar, MFA, federación. | Servicio extra, operación y customización. | Evaluar si crece la organización. |
| Auth0 / Cognito | Gestionado, rápido. | Costo por usuario, dependencia, datos fuera. | Rechazada para v1. |
| **Auth propia** | Control total, sin costo por usuario, integrada al dominio. | Responsabilidad de seguridad. | **Elegida.** |
| Solo contraseña | Simple. | No cumple RNF-06. | Rechazada. |

## Consecuencias

**Positivas**

- Control total del flujo y de la auditoría.
- Sin dependencia externa ni costo por identidad.
- Integración directa con roles y sedes.

**Negativas / riesgos**

- La seguridad depende de la implementación propia.
- Hay que gestionar recuperación, rotación y soporte.

**Mitigaciones**

- Usar librerías maduras (`argon2`, `otplib`, `@nestjs/jwt`).
- Pruebas de seguridad y revisión externa antes de producción.
- Checklist OWASP ASVS de autenticación.
- Plan de migración a Keycloak si se requiere SSO o federación.

## Reglas

- El refresh token se guarda hasheado; nunca en claro.
- Se invalida al cambiar contraseña, rol o estado del usuario.
- El MFA se exige también para operaciones sensibles (anulación de factura, reapertura de
  caja, exportación masiva).
- Los códigos de recuperación se muestran una sola vez.
