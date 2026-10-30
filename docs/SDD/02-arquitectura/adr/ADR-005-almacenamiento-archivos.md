# ADR-005 · Almacenamiento de archivos y documentos

- **Estado:** Propuesto
- **Fecha:** 2026-10-29
- **Decisores:** Arquitectura, Seguridad
- **Relacionados:** RF-20, RF-06, RNF-05, RNF-19

---

## Contexto

El sistema maneja radiografías, fotos clínicas, PDFs de consentimientos, recetas y
comprobantes. Guardar binarios en PostgreSQL complica backups, encarece el almacenamiento y
afecta el rendimiento. Además, los archivos contienen datos sensibles y no deben ser
accesibles por URL pública.

## Decisión

1. Almacenar archivos en **S3 compatible** (MinIO en desarrollo, S3/R2/Blob en producción).
2. La base de datos guarda solo **metadatos**: clave, tipo, tamaño, hash, propietario,
   relación clínica y estado de escaneo.
3. **Carga directa con URL prefirmada** (`PUT`) emitida por la API; la API valida tipo,
   tamaño y cuota antes de firmar.
4. **Descarga con URL prefirmada** de corta duración (≤ 5 min) y validación de permisos en
   cada solicitud.
5. **Escaneo antivirus** asíncrono antes de marcar el archivo como disponible.
6. **Cifrado en reposo** del bucket (SSE-S3/SSE-KMS) y TLS en tránsito.
7. **Versionado** de objetos y ciclo de vida para archivos huérfanos.
8. Estructura de claves: `locations/{locationId}/{patientId}/{documentId}/{version}-{name}`.

## Alternativas consideradas

| Alternativa | Pros | Contras | Veredicto |
|---|---|---|---|
| Binarios en PostgreSQL | Transaccional, backup único. | Crecimiento, memoria, backups lentos. | Rechazada. |
| Filesystem del servidor | Simple. | No escala, no sobrevive contenedores. | Rechazada. |
| **S3 + URLs firmadas** | Escalable, seguro, barato. | Requiere configurar CORS, lifecycle y IAM. | **Elegida.** |
| CDN pública | Rápida. | Expone datos sensibles. | Rechazada. |

## Consecuencias

**Positivas**

- Backups de base de datos pequeños y rápidos.
- Escalado independiente del almacenamiento.
- Control de acceso fino y auditable.

**Negativas / riesgos**

- Consistencia eventual entre carga y registro.
- Costos de egreso y almacenamiento.
- Complejidad de CORS y políticas.

**Mitigaciones**

- Confirmación de carga (`confirm`) que valida hash y tamaño.
- Job de limpieza de archivos no confirmados > 24 h.
- Presupuesto de almacenamiento y alertas.

## Reglas

- Nunca se sirve un archivo sin autorización.
- El nombre original no se usa como clave.
- Los PDFs firmados son inmutables; una corrección genera nueva versión.
- Los enlaces firmados no se registran en logs.
