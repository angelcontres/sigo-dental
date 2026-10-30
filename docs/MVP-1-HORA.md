# MVP 1 hora — SIGO-Dental

> **Objetivo:** tener un prototipo funcional y presentable en menos de 60 minutos, sin
> backend, sin instalaciones y sin firmas ni aprobaciones.

---

## 1. Decisión de alcance

El SRS y el SDD describen el sistema completo, pero **no se implementan en una hora**. Para
el MVP se elige un corte vertical que se pueda mostrar de punta a punta:

```text
Paciente → Turno → Odontograma → Cobro → Panel
```

| Se implementa | No se implementa (queda documentado) |
|---|---|
| Pacientes con alertas médicas | Login, roles y MFA |
| Agenda con estados de turno | Notificaciones WhatsApp/email |
| Odontograma interactivo por diente | Periodontograma, superficies múltiples |
| Cobros y cierre de caja simple | Facturación fiscal, comisiones |
| Panel con indicadores | Inventario, reportes, auditoría |
| Persistencia en el navegador | Base de datos, API, multi-sede |
| Datos de demo y reinicio | Migración, backups, consentimientos |

---

## 2. Stack

- **HTML + CSS + JavaScript vanilla**, sin dependencias ni build.
- **`localStorage`** como base de datos del navegador.
- Diseño responsive (escritorio y tablet).
- Se abre directamente con doble clic en `app/index.html`.

**Por qué:** cero instalación, cero servidor, cero espera. Ideal para una demo de una hora.

---

## 3. Plan de 60 minutos

| Minutos | Actividad | Resultado |
|---|---|---|
| 0–5 | Abrir el proyecto y revisar `app/` | Entorno listo. |
| 5–15 | Pacientes: alta, búsqueda, alertas | Ficha básica funcionando. |
| 15–28 | Agenda: alta de turno, estados | Turnos del día visibles. |
| 28–45 | Odontograma: dientes, condiciones, guardado | Hallazgos persistentes. |
| 45–53 | Caja: cobro, total, cierre | Cierre simple de caja. |
| 53–58 | Panel: métricas y alertas | Vista ejecutiva. |
| 58–60 | Reiniciar demo y presentar | Demo reproducible. |

> El código ya está entregado. Este plan sirve si hay que reconstruirlo o explicarlo en vivo.

---

## 4. Guion de demo (5 minutos)

1. **Panel:** mostrar pacientes, turnos de hoy, cobrado y alertas.
2. **Pacientes:** buscar "Gómez", abrir alerta de penicilina, crear un paciente nuevo.
3. **Agenda:** crear un turno para hoy, confirmarlo y pasarlo a "En sala" / "Atendido".
4. **Odontograma:** elegir el paciente, marcar caries en el diente 36, guardar y mostrar la
   marca en el arco.
5. **Caja:** cobrar una consulta en efectivo, ver el total y cerrar caja.
6. **Volver al panel:** verificar que los indicadores cambiaron.

---

## 5. Qué incluye la app

### 5.1 Pacientes

- Alta con nombre, documento, fecha de nacimiento, teléfono, alergias/alertas y notas.
- Búsqueda por nombre o documento.
- Edad calculada.
- Badge de alerta médica.
- Acceso directo a odontograma y agenda.

### 5.2 Agenda

- Turnos con paciente, fecha, hora, profesional, sillón y motivo.
- Estados: `PROGRAMADA`, `CONFIRMADA`, `EN_SALA`, `ATENDIDA`, `CANCELADA`.
- Acciones rápidas según estado.
- Filtro por fecha.

### 5.3 Odontograma

- 32 dientes permanentes en notación FDI.
- Condiciones: caries, restauración, endodoncia, ausente, corona, implante, sellante.
- Nota por diente.
- Guardado por paciente en `localStorage`.
- Equivalencia FDI ↔ Universal en el panel del diente.

### 5.4 Caja

- Cobro con paciente, concepto, monto y medio de pago.
- Total del día.
- Cierre de caja con resumen e historial simple.

### 5.5 Panel

- Cantidad de pacientes.
- Turnos de hoy y pendientes.
- Cobrado hoy.
- Alertas médicas activas.
- Próximos turnos.

---

## 6. Persistencia y reinicio

- Los datos se guardan en `localStorage` con la clave `sigo_mvp_v1`.
- El botón **"Reiniciar demo"** borra los datos y vuelve a los pacientes/turnos de ejemplo.
- No se envía nada a internet.

---

## 7. Limitaciones conocidas

- No hay autenticación: cualquiera que abra el archivo ve los datos.
- Los datos viven solo en ese navegador y dispositivo.
- No hay historial clínico completo ni auditoría.
- El odontograma es por diente, no por superficie múltiple.
- El cierre de caja es directo (no ciego).
- No se emiten comprobantes fiscales ni PDFs.
- No hay multi-sede ni multi-usuario real.

Estas limitaciones son deliberate: el MVP prioriza **mostrar el flujo**, no cumplir el SRS
completo.

---

## 8. Evolución sugerida (si se quiere seguir)

| Paso | Cambio | Esfuerzo |
|---|---|---|
| 1 | Pasar `localStorage` a SQLite/PostgreSQL | 1–2 días |
| 2 | API con NestJS + Prisma | 3–5 días |
| 3 | Login y roles básicos | 1–2 días |
| 4 | Odontograma por superficies y periodontograma | 3–5 días |
| 5 | Facturación y reportes | 1–2 semanas |

El diseño completo para esa evolución ya está en [`SDD/`](SDD/README.md).

---

## 9. Criterio de terminado del MVP

- [x] Se abre en el navegador sin instalar nada.
- [x] Permite crear y buscar pacientes.
- [x] Permite crear turnos y cambiar su estado.
- [x] Permite marcar y guardar hallazgos en el odontograma.
- [x] Permite registrar cobros y cerrar caja.
- [x] El panel refleja los datos.
- [x] Los datos sobreviven al recargar la página.
- [x] Hay datos de demo y un botón para reiniciar.
