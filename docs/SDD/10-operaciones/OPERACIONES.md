# 10 — Operaciones y soporte

| Campo | Valor |
|---|---|
| Documento | Modelo operativo, SLO y runbooks |
| Versión | 0.1.0 |
| Base | RNF-02, RNF-17, RNF-19, SEGURIDAD §10 |
| Audiencia | DevOps, soporte, dirección |

---

## 1. Modelo de soporte

| Nivel | Responsable | Alcance | Horario |
|---|---|---|---|
| N1 | Mesa de ayuda de la clínica | Consultas de uso, claves, incidencias simples. | Horario clínico. |
| N2 | Soporte técnico del proveedor | Errores de aplicación, datos, configuración. | 08:00–20:00. |
| N3 | Desarrollo / DevOps | Incidentes críticos, infraestructura, seguridad. | 24/7 para S1. |

**Canales:** portal de tickets, email y teléfono para S1. Todo ticket registra sede, usuario,
módulo, descripción, evidencia y `correlation_id`.

---

## 2. SLO y monitoreo

| SLO | Objetivo | Medición |
|---|---|---|
| Disponibilidad | 99,9 % (07:00–21:00) | Monitoreo sintético cada minuto. |
| Latencia API p95 | < 500 ms | Prometheus. |
| Odontograma p95 | < 1,5 s | RUM + trazas. |
| Errores 5xx | < 0,5 % | Prometheus. |
| Cola de recordatorios | retraso < 5 min | Métricas de BullMQ. |
| Backup exitoso | 100 % | Job de verificación. |
| Restauración | RTO ≤ 4 h | Prueba trimestral. |

**Dashboards:** visión general, API, agenda, caja, jobs, base de datos, seguridad.

---

## 3. Alertas

| Alerta | Umbral | Severidad | Acción |
|---|---|---|---|
| API 5xx | > 1 % en 5 min | S2 | Revisar logs/trazas; rollback si es deploy. |
| Latencia p95 | > 1 s en 10 min | S2 | Revisar DB, colas, recursos. |
| Disponibilidad | 2 fallos consecutivos | S1 | Verificar LB, API, DB. |
| Cola DLQ | > 10 jobs | S2 | Revisar errores y reintentar. |
| Disco DB | > 80 % | S2 | Ampliar/limpiar. |
| Backup fallido | 1 vez | S2 | Reintentar y escalar. |
| Certificado | < 14 días | S3 | Renovar. |
| Login fallido masivo | > 50 en 5 min | S2 | Posible ataque; rate limit/WAF. |
| Exportación masiva | > 10k filas | S3 | Verificar autorización. |

---

## 4. Incidentes

### 4.1 Severidades

| Sev | Ejemplo | Primera respuesta | Actualización |
|---|---|---|---|
| S1 | Caída total, brecha, pérdida de datos. | 15 min | Cada 30 min. |
| S2 | Función crítica degradada (agenda, caja). | 30 min | Cada 2 h. |
| S3 | Función no crítica o workaround. | 4 h hábiles | Diaria. |
| S4 | Consulta/mejora. | 1 día hábil | Según ticket. |

### 4.2 Proceso

```mermaid
flowchart LR
    A[Reporte] --> B[Triaje]
    B --> C[Contención]
    C --> D[Diagnóstico]
    D --> E[Resolución]
    E --> F[Verificación]
    F --> G[Post-mortem]
```

- **Comunicación:** estado en portal + email a afectados.
- **Escalamiento:** N1 → N2 → N3; S1 activa guardia.
- **Post-mortem** obligatorio para S1/S2: causa raíz, línea de tiempo, acciones y dueño.
- **Sin culpabilización:** foco en el sistema y los controles.

---

## 5. Cambios y despliegues

| Tipo | Ventana | Aprobación |
|---|---|---|
| Estándar (bugfix menor) | Martes/jueves 13:00–16:00 | Tech lead. |
| Normal (feature) | Ventana planificada | PO + Tech lead. |
| Emergencia (S1) | Inmediata | Guardia + Tech lead. |
| Migración destructiva | Ventana con backup | Arquitectura + negocio. |

- Cambios con plan de rollback documentado.
- Prohibido desplegar viernes después de las 15:00 salvo emergencia.
- Post-deploy: smoke tests y monitoreo 30 min.
- Registro de cambios en el release notes.

---

## 6. Backup y recuperación

### 6.1 Rutina

1. Backup automático diario + WAL continuo.
2. Verificación de integridad del backup.
3. Copia cifrada en zona secundaria.
4. Retención: 30 días diarios, 12 meses mensuales (ajustable).
5. Prueba de restauración trimestral en entorno aislado.

### 6.2 Runbook de restauración

1. Declarar incidente y notificar.
2. Identificar punto de recuperación (PITR).
3. Provisionar instancia limpia.
4. Restaurar backup + WAL hasta el punto.
5. Validar integridad (conteos, checksums, auditoría).
6. Repuntar la aplicación.
7. Smoke tests y comunicación.
8. Documentar tiempos reales (RTO/RPO).

---

## 7. Mantenimiento

| Actividad | Frecuencia | Responsable |
|---|---|---|
| Parches de seguridad | Mensual / crítico 72 h | DevOps. |
| Rotación de secretos | Semestral | Seguridad. |
| Revisión de accesos | Trimestral | Seguridad. |
| Prueba de restauración | Trimestral | DevOps. |
| Revisión de capacidad | Mensual | DevOps. |
| Limpieza de archivos huérfanos | Diaria (job) | Sistema. |
| Purga/archivado según retención | Anual | Compliance + DevOps. |
| Revisión de SLO | Mensual | Tech lead. |

---

## 8. Gestión de accesos

- Altas/bajas de usuarios de sistema con ticket y aprobación.
- MFA obligatoria para producción.
- Acceso a producción solo por bastión/VPN y con registro.
- Revisión trimestral de cuentas y permisos.
- Baja inmediata al egreso del empleado.
- Cuentas de servicio con permisos mínimos y rotación.

---

## 9. Continuidad del negocio

| Escenario | Impacto | Plan |
|---|---|---|
| Caída de API | Sin operación digital. | Failover/rollback; contingencia manual de agenda y caja. |
| Caída de DB | Sin operación. | Restauración/PITR; RTO 4 h. |
| Caída de internet en sede | Sin acceso. | Registro manual en formularios de contingencia; carga posterior. |
| Caída de proveedor de pagos | No se cobra con tarjeta. | Cobro en efectivo/transferencia; conciliación manual. |
| Caída de mensajería | Sin recordatorios. | Llamadas manuales; reintento automático. |
| Fuga de datos | Crisis legal. | Protocolo de incidentes S1 + notificación. |

**Contingencia manual:** la clínica debe tener formularios impresos mínimos (alta, nota,
comprobante) y un procedimiento para cargarlos luego, con autorización.

---

## 10. Reporte mensual de operación

- Disponibilidad y latencia vs. SLO.
- Incidentes por severidad y tiempo de resolución.
- Cambios desplegados y rollbacks.
- Backups y pruebas de restauración.
- Alertas de seguridad y accesos.
- Capacidad y costos.
- Acciones de mejora con dueño y fecha.

---

## 11. Runbooks disponibles (a completar en E4)

| Runbook | Estado |
|---|---|
| Despliegue y rollback | Pendiente. |
| Restauración de base de datos | Borrador (§6.2). |
| Cola en dead-letter | Pendiente. |
| Certificado vencido | Pendiente. |
| Disco/conexiones DB | Pendiente. |
| Caída de pasarela de pagos | Pendiente. |
| Caída de mensajería | Pendiente. |
| Incidente de seguridad | Borrador (SEGURIDAD §10). |
| Alta/baja de usuario de producción | Pendiente. |

Cada runbook debe incluir: síntoma, impacto, diagnóstico, pasos, verificación y
escalamiento.
