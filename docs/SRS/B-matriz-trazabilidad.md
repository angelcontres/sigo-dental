# Anexo B — Matriz de trazabilidad

Vincula cada requisito con su caso de uso, módulo de diseño, caso de prueba y etapa de
entrega. Si un requisito no tiene prueba asociada, **no puede considerarse terminado**.

Leyenda: `E1`–`E4` = etapa de entrega (ver SRS §4). `MD` = módulo de diseño del SDD.
`TP` = caso de prueba del [plan de pruebas](../SDD/09-pruebas/PLAN-PRUEBAS.md).

---

## 1. Requisitos funcionales

| Requisito | Nombre | UC | MD | TP | Etapa | Estado |
|---|---|---|---|---|---|---|
| RF-01 | Registro unificado de pacientes | UC-01 | MD-01 | TP-01, TP-02 | E1 | Pendiente |
| RF-02 | Anamnesis y alertas médicas | UC-02 | MD-01 | TP-03 | E1 | Pendiente |
| RF-03 | Odontograma interactivo | UC-03 | MD-02 | TP-05, TP-06 | E2 | Pendiente |
| RF-04 | Periodontograma | UC-04 | MD-02 | TP-07 | E2 | Pendiente |
| RF-05 | Notas SOEP | — | MD-02 | TP-08 | E2 | Pendiente |
| RF-06 | Consentimiento informado | UC-05 | MD-03 | TP-09 | E2 | Pendiente |
| RF-07 | Presupuestos multinivel | UC-06 | MD-04 | TP-10 | E2 | Pendiente |
| RF-08 | Aprobación y tareas | UC-07 | MD-04 | TP-11 | E2 | Pendiente |
| RF-09 | Agenda multi-sede | UC-08 | MD-05 | TP-12 | E1 | Pendiente |
| RF-10 | Estados de cita | UC-09 | MD-05 | TP-13 | E1 | Pendiente |
| RF-11 | Notificaciones | UC-10 | MD-05 | TP-14 | E1/E3 | Pendiente |
| RF-12 | POS y facturación | UC-11 | MD-06 | TP-15 | E1/E3 | Pendiente |
| RF-13 | Liquidación de honorarios | — | MD-06 | TP-17 | E3 | Pendiente |
| RF-14 | Descargo de insumos | UC-13 | MD-07 | TP-18 | E3 | Pendiente |
| RF-15 | Usuarios, roles y permisos | UC-14 | MD-08 | TP-19 | E1 | Pendiente |
| RF-16 | Catálogos y parametrización | UC-14 | MD-08 | TP-20 | E1 | Pendiente |
| RF-17 | Apertura y cierre de caja | UC-12 | MD-06 | TP-16 | E1 | Pendiente |
| RF-18 | Auditoría consultable | UC-15 | MD-09 | TP-22 | E1 | Pendiente |
| RF-19 | Búsqueda de pacientes | UC-01 | MD-01 | TP-04 | E1 | Pendiente |
| RF-20 | Documentos y adjuntos | — | MD-02 | TP-24 | E2 | Pendiente |
| RF-21 | Recetas digitales | UC-18 | MD-03 | TP-25 | E2 | Pendiente |
| RF-22 | Reportes | UC-17 | MD-09 | TP-23 | E3 | Pendiente |
| RF-23 | Tablero operativo | UC-17 | MD-09 | TP-23 | E3 | Pendiente |
| RF-24 | Portal del paciente (PWA) | — | — | — | Roadmap | Fuera de v1 |
| RF-25 | Migración de datos | UC-16 | MD-09 | TP-26 | E1/E4 | Pendiente |
| RF-26 | Gestión multi-sede | UC-14 | MD-08 | TP-21 | E1 | Pendiente |

> RF-05, RF-13, RF-20 y RF-24 no tienen caso de uso propio: sus flujos están especificados en
> el diseño funcional del módulo correspondiente y se validan con los casos de prueba
> indicados. RF-24 está fuera de v1.

---

## 2. Requisitos no funcionales

| Requisito | Verificación | TP / evidencia | Etapa |
|---|---|---|---|
| RNF-01 | Rendimiento p95 | TP-27 | E4 |
| RNF-02 | Disponibilidad / monitoreo | TP-30 + dashboard SLO | E4 |
| RNF-03 | Concurrencia | TP-27 | E4 |
| RNF-04 | Escalabilidad | Revisión de arquitectura + TP-27 | E4 |
| RNF-05 | Cifrado | TP-28 | E4 |
| RNF-06 | Auth/RBAC/MFA | TP-19, TP-28 | E1/E4 |
| RNF-07 | Auditoría | TP-22 | E1 |
| RNF-08 | OWASP / SAST / DAST | TP-28 | E4 |
| RNF-09 | Privacidad por diseño | Revisión legal + TP-28 | E4 |
| RNF-10 | Gestión de secretos | TP-28 | E4 |
| RNF-11 | Responsive | TP-29 | E2 |
| RNF-12 | Navegadores | TP-29 | E2 |
| RNF-13 | Accesibilidad | TP-29 | E2 |
| RNF-14 | Localización | TP-29 | E2 |
| RNF-15 | Usabilidad clínica | UAT-02 (medición de tiempos) | E4 |
| RNF-16 | Mantenibilidad | Cobertura + revisión | E1–E4 |
| RNF-17 | Observabilidad | TP-30 | E4 |
| RNF-18 | Capacidad | TP-27 | E4 |
| RNF-19 | Backup/DR | TP-30 | E4 |
| RNF-20 | Retención | Revisión + job de purga | E4 |
| RNF-21 | Interoperabilidad | OpenAPI + revisión | E3 |
| RNF-22 | Documentación | Checklist de release | E4 |
| RNF-23 | Impresión | TP-29 | E3 |

---

## 3. Reglas de negocio

| Regla | Requisitos afectados | Verificación |
|---|---|---|
| RN-01 | RF-03, RF-05 | TP-06, TP-08 |
| RN-02 | RF-17 | TP-16 |
| RN-03 | RF-09 | TP-12 |
| RN-04 | RF-09 | TP-12 |
| RN-05 | RF-07, RF-08 | TP-10, TP-11 |
| RN-06 | RF-14 | TP-18 |
| RN-07 | RF-12 | TP-15 |
| RN-08 | RF-01, RF-06, RF-08 | TP-02, TP-09 |
| RN-09 | RF-01, RF-15, RF-16 | TP-01, TP-19 |
| RN-10 | RF-12 | TP-15 |
| RN-11 | RF-13 | TP-17 |
| RN-12 | RF-06 | TP-09 |
| RN-13 | RF-03 | TP-06 |
| RN-14 | RF-09, RF-17, RF-22 | TP-12, TP-16 |
| RN-15 | RF-07 | TP-10 |
| RN-16 | RF-02, RF-21 | TP-03, TP-25 |

---

## 4. Cobertura por etapa

| Etapa | Requisitos Must | Requisitos Should | Requisitos Could | Pruebas asociadas |
|---|---|---|---|---|
| E1 | RF-01, 02, 09, 10, 12 (POS), 15, 16, 17, 18, 19, 26 | RF-11 (email), RF-25 | — | TP-01…04, 12, 13, 15, 16, 19…22, 26 |
| E2 | RF-03, 05, 06, 07, 08 | RF-04, 20, 21 | — | TP-05…11, 24, 25, 29 |
| E3 | RF-12 (fiscal) | RF-11 (WhatsApp/SMS), 13, 14, 22 | RF-23 | TP-14, 17, 18, 23 |
| E4 | — | RF-25 (cierre) | — | TP-27, 28, 30 + UAT |

---

## 5. Mantenimiento de la matriz

1. Todo requisito nuevo se agrega al SRS y a esta matriz en el mismo cambio.
2. Todo caso de prueba nuevo se referencia desde el requisito que cubre.
3. En cada release se verifica que el 100 % de los requisitos `Must` tenga prueba
   ejecutada y evidencia adjunta.
4. Los requisitos `Won't` de v1 permanecen con etapa `Roadmap` y sin TP.
