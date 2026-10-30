# Preguntas y decisiones abiertas

Registro vivo de decisiones pendientes de la Fase 1. Cada pregunta tiene un supuesto
provisional para no bloquear el diseño; si el supuesto cambia, se evalúa el impacto en el
SRS y en el SDD.

**Estados:** `Abierta`, `En análisis`, `Resuelta`, `Descartada`.

---

## 1. Bloqueantes para el diseño

| ID | Pregunta | Por qué importa | Supuesto provisional | Responsable | Estado |
|---|---|---|---|---|---|
| Q-01 | ¿En qué país opera la clínica y cuál es la autoridad fiscal? ¿Moneda e impuestos? | Define facturación, comprobantes, validaciones de documento y normativa de datos. | Un solo país; moneda e impuesto configurables. | Sponsor / Asesor fiscal | Abierta |
| Q-02 | ¿Qué proveedor de facturación electrónica se usará? ¿Tiene API? | Determina el adaptador de IF-02 y el alcance de E3. | Adaptador desacoplado; POS interno en E1. | TI / Contador | Abierta |
| Q-03 | ¿Cuántas sedes y sillones existen hoy y en 24 meses? ¿Se comparte stock? | Afecta el modelo multi-sede, agenda y reportes. | 1–3 sedes; stock por sede con transferencias. | Dirección | Abierta |
| Q-04 | ¿Qué validez legal se exige para la firma de consentimientos? ¿Basta firma electrónica simple? | Define si se requiere certificado digital, OTP o biometría. | Firma en canvas + hash + OTP; certificado en roadmap. | Asesor legal | Abierta |
| Q-05 | ¿De dónde migran los datos? ¿Formato, volumen y calidad? | Condiciona el esfuerzo de E1/E4 y el riesgo de duplicados. | CSV/Excel con limpieza asistida (RF-25). | TI / Administración | Abierta |

---

## 2. Alcance y producto

| ID | Pregunta | Por qué importa | Supuesto provisional | Responsable | Estado |
|---|---|---|---|---|---|
| Q-06 | ¿Qué debe pasar si se cae internet durante la atención o el cobro? | Puede requerir modo offline/PWA o contingencia manual. | Operación degradada documentada; sin offline en v1. | Dirección / TI | Abierta |
| Q-07 | ¿Se usará WhatsApp Business API? ¿Quién asume el costo y la verificación? | Define RF-11 y el proveedor de mensajería. | Email en E1; WhatsApp/SMS en E3. | Dirección | Abierta |
| Q-08 | ¿El portal del paciente es prioritario para el negocio? | Podría adelantar RF-24 y cambiar el roadmap. | Fuera de v1; diseño extensible. | Sponsor | Abierta |
| Q-09 | ¿Quién redacta y aprueba los textos legales de consentimientos y aviso de privacidad? | Sin textos aprobados no se puede emitir documentos válidos. | La clínica aporta textos; el sistema los versiona. | Asesor legal | Abierta |
| Q-10 | ¿Existe integración con laboratorios de prótesis? | Afecta costos, estados de trabajo y fechas de entrega. | Registro manual de costo/estado; integración futura. | Odontología | Abierta |
| Q-11 | ¿Cómo se manejan convenios y seguros? ¿Autorización previa por prestación? | Cambia el flujo de presupuestos y cobros. | Cobertura informativa; autorización manual. | Administración | Abierta |
| Q-12 | ¿Qué política de no-show y señas se aplica? | Define cargos, cancelaciones y recordatorios. | Sin cargo automático; motivo y registro. | Dirección | Abierta |
| Q-13 | ¿Se requiere impresión térmica de 80 mm? ¿Qué modelo? | Afecta RNF-23 y el diseño de comprobantes. | A4 + térmica 80 mm configurables. | Recepción | Abierta |
| Q-14 | ¿Qué idiomas necesita la interfaz? | Impacta i18n y esfuerzo de UI. | Solo español en v1; textos externalizados. | Dirección | Abierta |
| Q-15 | ¿Se necesita videollamada o teleodontología? | Sería un módulo nuevo. | Fuera de v1. | Sponsor | Abierta |
| Q-16 | ¿Qué reglas de comisión usa hoy la clínica? | Define RF-13 y el modelo de liquidaciones. | Porcentaje sobre cobrado, con deducción de laboratorio. | Contador | Abierta |

---

## 3. Operación y tecnología

| ID | Pregunta | Por qué importa | Supuesto provisional | Responsable | Estado |
|---|---|---|---|---|---|
| Q-17 | ¿Hosting en nube, VPS o servidor propio? ¿Restricciones de datos? | Define infraestructura, backups y cumplimiento. | Nube en una región; contenedores. | TI | Abierta |
| Q-18 | ¿Qué dispositivos y navegadores usan hoy? | Valida RNF-11/RNF-12 y el diseño táctil. | Tablets ≥ 10.5", Chrome/Edge actualizados. | Recepción / TI | Abierta |
| Q-19 | ¿Cuántos usuarios concurrentes reales en hora pico? | Ajusta RNF-03 y el dimensionamiento. | 150 concurrentes. | Dirección | Abierta |
| Q-20 | ¿Quién administra el sistema y quién da soporte nivel 1? | Define roles, capacitación y operaciones. | Administrador TI interno + soporte del proveedor. | Dirección | Abierta |
| Q-21 | ¿Se exige retención de historia clínica mayor a 10 años? | Afecta RNF-20 y el almacenamiento. | 10 años o normativa local. | Asesor legal | Abierta |
| Q-22 | ¿Hay requisitos de interoperabilidad con obras sociales, seguros o historia clínica nacional? | Podría requerir FHIR o exportaciones específicas. | Exportación CSV; FHIR en roadmap. | TI / Administración | Abierta |

---

## 4. Decisiones tomadas (registro)

| ID | Fecha | Decisión | Justificación | Impacto |
|---|---|---|---|---|
| D-01 | 2026-10-29 | Documentación en español, identificadores técnicos en inglés. | Equipo y stakeholders hispanohablantes. | Bajo. |
| D-02 | 2026-10-29 | Monolito modular en lugar de microservicios para v1. | Equipo reducido y alcance acotado (ADR-001). | Arquitectura y despliegue. |
| D-03 | 2026-10-29 | Firma electrónica simple en v1. | Reduce complejidad; validar con legal (Q-04). | RF-06. |
| D-04 | 2026-10-29 | El odontograma se modela como hallazgos versionados, no como una imagen. | Permite auditoría, comparación y reportes. | Modelo de datos. |

---

## 5. Cómo se cierra una pregunta

1. Se discute con el responsable y se propone una decisión.
2. Se registra la decisión con fecha, justificación e impacto.
3. Se actualizan SRS, SDD y matriz de trazabilidad si corresponde.
4. La pregunta pasa a `Resuelta` y deja de bloquear.

> Las preguntas `Q-01` a `Q-05` deben cerrarse antes de la aprobación del SRS `v1.0.0`.
