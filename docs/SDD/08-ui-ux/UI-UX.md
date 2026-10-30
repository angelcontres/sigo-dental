# 08 — UI/UX y design system

| Campo | Valor |
|---|---|
| Documento | Diseño de interfaz y experiencia |
| Versión | 0.1.0 |
| Base | RNF-11 a RNF-15, WCAG 2.2 AA |
| Audiencia | Diseño, frontend, QA, clínica |

---

## 1. Principios de experiencia

| # | Principio | Implicancia |
|---|---|---|
| UX-01 | **La atención primero.** | El flujo clínico tiene mínima fricción; nada compite con el paciente. |
| UX-02 | **Tablet-first en el sillón.** | Controles grandes, gestos simples, sin dependencia del mouse. |
| UX-03 | **Información crítica siempre visible.** | Alertas médicas, estado del turno y saldo en la cabecera. |
| UX-04 | **Prevención de errores.** | Confirmaciones en acciones destructivas, validación inline, undo donde sea seguro. |
| UX-05 | **Lenguaje claro.** | Términos clínicos correctos; mensajes en español, sin jerga técnica. |
| UX-06 | **Accesible.** | Contraste, foco, teclado, alternativas al color. |
| UX-07 | **Rápido percibido.** | Skeletons, guardado optimista, feedback inmediato. |
| UX-08 | **Consistencia.** | Un patrón por problema; componentes reutilizables. |

---

## 2. Design tokens

### 2.1 Color

| Token | Valor | Uso |
|---|---|---|
| `--color-primary` | `#0F6E6E` | Acciones principales, navegación activa. |
| `--color-primary-hover` | `#0B5757` | Hover. |
| `--color-accent` | `#1E88E5` | Enlaces, selección. |
| `--color-bg` | `#F7F9FA` | Fondo general. |
| `--color-surface` | `#FFFFFF` | Tarjetas, tablas. |
| `--color-text` | `#1A2B32` | Texto principal. |
| `--color-muted` | `#5B6B73` | Texto secundario. |
| `--color-border` | `#D7E0E4` | Bordes. |
| `--color-success` | `#2E7D32` | Confirmaciones. |
| `--color-warning` | `#B26A00` | Advertencias. |
| `--color-danger` | `#C62828` | Errores, alertas críticas. |
| `--color-info` | `#0277BD` | Información. |

**Odontograma (accesible):**

| Condición | Color | Patrón |
|---|---|---|
| Caries | `#D32F2F` | Punto |
| Restauración | `#1565C0` | Rayado |
| Endodoncia realizada | `#6A1B9A` | Círculo |
| Endodoncia requerida | `#EF6C00` | Círculo punteado |
| Implante | `#2E7D32` | Tornillo |
| Prótesis | `#00838F` | Corona/puente |
| Exodoncia | `#263238` | X |
| Sellante | `#F9A825` | Punto |
| Ausente | `#90A4AE` | X tenue |
| En tratamiento | `#00897B` | Línea |

Cada condición incluye además ícono y etiqueta textual; el color nunca es el único
indicador.

### 2.2 Tipografía

| Token | Valor |
|---|---|
| `--font-sans` | `Inter, system-ui, sans-serif` |
| `--text-xs` | 12 px / 16 px |
| `--text-sm` | 14 px / 20 px |
| `--text-base` | 16 px / 24 px |
| `--text-lg` | 18 px / 28 px |
| `--text-xl` | 22 px / 30 px |
| `--text-2xl` | 28 px / 36 px |
| `--weight-regular` | 400 |
| `--weight-medium` | 500 |
| `--weight-semibold` | 600 |

Mínimo 16 px en campos de formulario para evitar zoom en iOS/tablet.

### 2.3 Espaciado y radios

Escala base 4 px: `4, 8, 12, 16, 24, 32, 48, 64`.
Radios: `sm 6 px`, `md 10 px`, `lg 16 px`, `full 9999 px`.
Sombras: `sm` para tarjetas, `md` para modales, `lg` para popovers.

### 2.4 Áreas táctiles

- Mínimo **44×44 px** para cualquier control.
- Separación mínima de 8 px entre acciones.
- Botones primarios de al menos 48 px de alto en tablet.

---

## 3. Estructura de navegación

```text
┌─────────────────────────────────────────────────────────────┐
│ Barra superior: sede · búsqueda global · alertas · usuario  │
├──────────────┬──────────────────────────────────────────────┤
│ Navegación   │ Contenido                                    │
│ lateral      │                                              │
│              │                                              │
│ · Agenda     │  ┌────────────────────────────────────────┐  │
│ · Pacientes  │  │ Cabecera del paciente / contexto       │  │
│ · Clínica    │  ├────────────────────────────────────────┤  │
│ · Finanzas   │  │ Contenido principal                    │  │
│ · Inventario │  │                                        │  │
│ · Reportes   │  │                                        │  │
│ · Admin      │  └────────────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────────────┘
```

- Navegación colapsable en tablet; inferior en móvil (solo lectura, futuro).
- La sede activa siempre visible; cambiarla recarga el contexto.
- La búsqueda global (`Ctrl/Cmd + K`) busca pacientes y acciones.
- Breadcrumbs en flujos profundos (paciente → presupuesto → ítem).

---

## 4. Pantallas clave

### 4.1 Agenda

- Vista día: columnas por sillón o profesional, tarjetas de turno con color por estado.
- Encabezado con fecha, filtros y botón "Nuevo turno".
- Tarjeta: hora, paciente, procedimiento, estado, badge de alerta.
- Acciones rápidas: confirmar, llegar, iniciar, cancelar (long-press o menú).
- Drag & drop en escritorio; en tablet, mover desde el detalle.
- Indicador de "ahora" y scroll automático a la hora actual.

### 4.2 Expediente del paciente

- Cabecera fija: nombre, edad, documento, alertas críticas, saldo, última visita.
- Pestañas: Resumen · Odontograma · Periodontograma · Notas · Documentos · Tratamientos ·
  Pagos.
- Acciones primarias: "Nueva nota", "Nuevo presupuesto", "Agendar".
- El odontograma es la pestaña por defecto para odontólogos.

### 4.3 Odontograma

- Dos arcos (superior/inferior) en SVG, con zoom y paneo.
- Panel lateral de diente: superficies, condiciones, historial.
- Selector de notación y dentición en la barra superior.
- Leyenda colapsable con patrones e íconos.
- Botón "Firmar estudio" con confirmación y resumen de cambios.
- En tablet, el panel pasa a hoja inferior (bottom sheet).

### 4.4 POS / Cobro

- Columna izquierda: ítems a cobrar y total.
- Columna derecha: medios de pago, montos y vuelto.
- Teclado numérico grande; soporte de lector de tarjetas (si aplica).
- Validación en vivo del saldo; no permite cobrar de más.
- Confirmación con resumen y opción de imprimir/enviar.

### 4.5 Cierre de caja

- Paso 1: conteo por medio de pago (sin totales teóricos).
- Paso 2: revelación de diferencias y observación.
- Paso 3: confirmación y PDF.
- El total teórico se oculta hasta completar el paso 1 (RN-02).

---

## 5. Componentes

| Componente | Estados | Notas |
|---|---|---|
| Botón | default, hover, focus, active, disabled, loading | Variantes primario/secundario/peligro. |
| Campo de texto | default, focus, error, disabled, readonly | Etiqueta persistente; ayuda contextual. |
| Selector | default, abierto, con búsqueda | Soporta teclado. |
| Tabla | loading, vacío, error, con paginación | Cabecera fija; filas de 48 px. |
| Modal | abierto, cerrado, confirmación | Foco atrapado; Esc cierra. |
| Toast | éxito, error, advertencia, info | 5 s; acción opcional. |
| Badge de alerta | crítica, alta, media | Ícono + texto, no solo color. |
| Timeline | — | Eventos clínicos y administrativos. |
| Skeleton | — | Carga percibida. |
| Empty state | — | Explica qué hacer, no solo "sin datos". |

---

## 6. Formularios

1. Etiquetas visibles (no solo placeholder).
2. Validación al salir del campo y al enviar; nunca solo al hacer submit.
3. Mensajes de error específicos y accionables.
4. Agrupación en secciones con títulos claros.
5. Autoguardado de borradores clínicos cada 30 s.
6. Confirmación al salir con cambios sin guardar.
7. Campos obligatorios marcados; el resto, opcional.
8. Soporte de teclado completo y `Enter` para enviar cuando corresponda.

---

## 7. Accesibilidad (WCAG 2.2 AA)

| Criterio | Implementación |
|---|---|
| Contraste | ≥ 4.5:1 texto normal; ≥ 3:1 texto grande. |
| Foco | Visible y orden lógico; no se elimina el outline. |
| Teclado | Todos los flujos operables sin mouse. |
| Etiquetas | `label` asociado; ARIA solo cuando es necesario. |
| Errores | Anunciados con `aria-live`. |
| Color | Nunca único indicador; patrones/íconos/texto. |
| Movimiento | Respeta `prefers-reduced-motion`. |
| Zoom | 200 % sin pérdida de contenido. |
| Tablas | Encabezados y alcance correctos. |
| Modales | Foco atrapado y retorno al origen. |

**Pruebas:** axe automatizado en CI + revisión manual con teclado y lector de pantalla
(NVDA/VoiceOver) en flujos críticos.

---

## 8. Responsive

| Breakpoint | Ancho | Uso |
|---|---|---|
| `sm` | < 640 px | No prioritario (consulta). |
| `md` | 640–1023 px | Tablet vertical. |
| `lg` | 1024–1439 px | Tablet horizontal / laptop. |
| `xl` | ≥ 1440 px | Escritorio. |

- Sin scroll horizontal en flujos críticos.
- Tablas con columnas prioritarias y detalle expandible en tablet.
- El odontograma ocupa el ancho disponible y permite zoom.

---

## 9. Impresión

- **Comprobantes:** A4 y térmica 80 mm; logo, datos fiscales, detalle, totales y QR (si
  aplica).
- **Recetas y consentimientos:** A4 con firma, hash y datos de la clínica.
- **Reportes:** A4 horizontal/vertical según contenido, con fecha de generación.
- Los estilos de impresión se definen con `@media print` y se prueban en Chrome/Edge.

---

## 10. Microcopy

| Situación | Texto |
|---|---|
| Error de solapamiento | "Ese horario ya está ocupado en el Sillón 2. Te mostramos los más cercanos." |
| Cierre de caja | "Ingresá el conteo físico. El total del sistema se mostrará después." |
| Alerta crítica | "Alergia a penicilina. Verificá antes de prescribir." |
| Guardado | "Guardado hace un momento" / "Sin conexión: reintentando…" |
| Vacío | "Todavía no hay presupuestos. Creá el primero desde el odontograma." |
| Destructivo | "Esta acción no se puede deshacer. ¿Confirmás la anulación?" |

Tono: claro, directo, respetuoso; sin humor en contextos clínicos.

---

## 11. Prototipo y validación

- Wireframes de baja fidelidad para agenda, expediente y odontograma (Fase 1).
- Prueba con 3–5 odontólogos y 2 recepcionistas.
- Métricas: tiempo de tarea, errores, satisfacción (SUS).
- Iterar antes de construir; el prototipo no reemplaza el SRS.

**Pendiente:** prototipo navegable y validación en tablet real (`Q-18`).

---

## 12. Pruebas asociadas

`TP-29` (responsive, accesibilidad, impresión), `TP-05` (interacción del odontograma),
`UAT-02` (usabilidad clínica).
