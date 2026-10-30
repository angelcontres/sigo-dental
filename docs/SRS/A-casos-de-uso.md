# Anexo A — Casos de uso detallados

Especificación de los flujos críticos de SIGO-Dental. Cada caso de uso referencia los
requisitos (`RF`), reglas de negocio (`RN`) y módulos de diseño (`MD`) que lo implementan.

| Campo | Descripción |
|---|---|
| **Actor principal** | Quien inicia y obtiene el beneficio. |
| **Actores secundarios** | Sistemas o personas que participan. |
| **Precondiciones** | Deben cumplirse antes del flujo. |
| **Postcondiciones** | Estado garantizado al finalizar con éxito. |

---

## UC-01 · Registrar paciente y tutor

- **Actores:** Recepcionista (principal), Administrador TI.
- **Requisitos:** RF-01, RF-19, RN-08, RN-09.
- **Precondiciones:** sesión iniciada; sede seleccionada; catálogos de tipos de documento y
  coberturas cargados.
- **Postcondiciones:** paciente creado o actualizado; auditoría registrada; alertas visibles.

**Flujo principal**

1. Recepción busca al paciente por documento, teléfono o nombre (RF-19).
2. Si no existe, selecciona "Nuevo paciente".
3. Completa datos obligatorios; el sistema valida formato de documento y mayoría de edad.
4. Si es menor, agrega tutor legal con documento y parentesco.
5. Asocia cobertura (seguro/convenio) y número de afiliado.
6. Registra contacto de emergencia.
7. Confirma; el sistema verifica duplicados y persiste.
8. Se muestra la ficha con badge de alertas (si hubiera) y accesos a expediente/agenda.

**Flujos alternativos**

- **A1. Duplicado exacto:** se bloquea y se ofrece abrir la ficha existente.
- **A2. Duplicado probable:** se muestran coincidencias y se exige confirmación con motivo.
- **A3. Documento inválido:** mensaje inline; no se permite guardar.
- **A4. Tutor faltante:** se bloquea el guardado hasta completar los datos del tutor.

---

## UC-02 · Registrar anamnesis y alertas médicas

- **Actores:** Odontólogo (principal), Asistente dental (colabora).
- **Requisitos:** RF-02, RN-16.
- **Precondiciones:** paciente existente y turno en atención (opcional).
- **Postcondiciones:** anamnesis versionada y firmada; alertas activas en cabecera.

**Flujo principal**

1. El profesional abre el expediente y selecciona "Anamnesis".
2. Registra enfermedades sistémicas, alergias, medicación, cirugías y hábitos.
3. Marca severidad de cada alergia y condiciones críticas.
4. El sistema genera los badges correspondientes.
5. El profesional firma la anamnesis.
6. Se guarda una nueva versión con fecha, autor y motivo.

**Flujos alternativos**

- **A1. "Sin antecedentes":** se registra declaración explícita firmada.
- **A2. Alerta crítica al prescribir:** el sistema bloquea y exige justificación + firma
  (RF-21).
- **A3. Intento de eliminar alerta por recepción:** se rechaza por permisos.

---

## UC-03 · Registrar hallazgos en el odontograma

- **Actores:** Odontólogo (principal), Asistente dental (lectura).
- **Requisitos:** RF-03, RN-01, RN-13.
- **Precondiciones:** paciente con turno en atención o consulta de control; odontograma
  inicial creado.
- **Postcondiciones:** hallazgos persistidos, versionados y auditados.

**Flujo principal**

1. El odontólogo abre el odontograma del paciente.
2. Selecciona dentición (permanente/decidua/mixta) y notación (FDI/Universal).
3. Selecciona un diente y una o más superficies.
4. Elige el estado del catálogo (caries, restauración, endodoncia, etc.).
5. Indica si es `existente`, `requerido` o `realizado`, agrega nota opcional.
6. Confirma; el sistema valida y guarda con profesional y timestamp.
7. La vista se actualiza y queda disponible para comparación histórica.

**Flujos alternativos**

- **A1. Hallazgo ya registrado:** se muestra el existente y se permite adenda, no duplicado.
- **A2. Estudio firmado:** se bloquea la edición; se ofrece nuevo estudio o adenda.
- **A3. Intento de borrar un `realizado`:** se rechaza (RN-01).

---

## UC-04 · Registrar periodontograma

- **Actores:** Odontólogo, Asistente dental.
- **Requisitos:** RF-04.
- **Precondiciones:** paciente y estudio periodontal abierto.
- **Postcondiciones:** estudio firmado con NIC calculado y comparación disponible.

**Flujo principal**

1. Se crea un estudio con fecha y motivo.
2. Por diente y sitio se ingresan profundidad de sondaje y margen gingival.
3. Se marcan sangrado, supuración, movilidad y furca.
4. El sistema calcula NIC por sitio y totales.
5. El odontólogo revisa el gráfico y firma.
6. Se habilita la comparación con el estudio anterior.

**Alternativas**

- **A1. Valor fuera de rango:** advertencia, no bloqueo.
- **A2. Estudio incompleto:** se guarda como borrador, no se firma.
- **A3. Sin estudio previo:** se omite la comparación.

---

## UC-05 · Emitir consentimiento informado

- **Actores:** Odontólogo (principal), paciente/tutor, Recepcionista (apoyo).
- **Requisitos:** RF-06, RN-08, RN-12.
- **Precondiciones:** procedimiento definido; plantilla vigente; paciente identificado.
- **Postcondiciones:** consentimiento firmado, sellado y vinculado al procedimiento.

**Flujo principal**

1. El odontólogo selecciona el procedimiento y la plantilla correspondiente.
2. El sistema completa datos de paciente, tutor, profesional y clínica.
3. Se presenta el texto; el paciente/tutor lee y acepta.
4. Firma en canvas táctil o valida por OTP.
5. El sistema genera PDF, calcula hash SHA-256 y guarda el documento.
6. Se vincula al procedimiento y se registra en auditoría.

**Alternativas**

- **A1. Paciente menor sin tutor:** se bloquea (RN-08).
- **A2. OTP expirado:** se reenvía con límite de intentos.
- **A3. Revocación:** se registra motivo y se conserva el original.
- **A4. Urgencia sin consentimiento:** se permite con justificación firmada y auditoría.

---

## UC-06 · Elaborar presupuesto

- **Actores:** Odontólogo (principal), Recepción (apoyo).
- **Requisitos:** RF-07, RN-05, RN-15.
- **Precondiciones:** paciente con diagnóstico; catálogo de procedimientos vigente.
- **Postcondiciones:** presupuesto en estado `borrador` o `enviado`, versionado.

**Flujo principal**

1. Se crea un presupuesto con vigencia y moneda.
2. Se agregan ítems (procedimiento, diente/superficie, cantidad, precio).
3. El sistema toma el precio vigente y lo congela en el ítem (RN-15).
4. Se agrupan ítems en fases/sesiones.
5. Se aplican descuentos dentro del umbral o con autorización.
6. Se calculan subtotales, impuestos y total.
7. Se previsualiza el PDF y se envía al paciente.

**Alternativas**

- **A1. Descuento excedido:** requiere aprobación registrada.
- **A2. Presupuesto enviado:** editarlo genera nueva versión (RN-05).
- **A3. Catálogo sin precio para la sede:** se bloquea el ítem.

---

## UC-07 · Aprobar presupuesto y generar tareas

- **Actores:** Paciente/tutor, Recepcionista u Odontólogo (registra).
- **Requisitos:** RF-08, RN-05, RN-08.
- **Precondiciones:** presupuesto vigente y enviado.
- **Postcondiciones:** aprobación registrada; tareas de tratamiento creadas.

**Flujo principal**

1. Se abre el presupuesto y se selecciona "Aprobar".
2. El paciente elige aprobación total o ítems específicos.
3. Se captura firma u OTP.
4. El sistema registra la aprobación con fecha y usuario.
5. Los ítems aprobados generan tareas `pendientes`.
6. El presupuesto pasa a `aprobado` o `parcialmente aprobado`.

**Alternativas**

- **A1. Rechazo:** se solicita motivo; estado `rechazado`.
- **A2. Presupuesto vencido:** requiere reactivación autorizada.
- **A3. Ítem ya realizado:** no se vuelve a generar tarea.

---

## UC-08 · Agendar turno

- **Actores:** Recepcionista (principal), Odontólogo.
- **Requisitos:** RF-09, RN-03, RN-04, RN-14.
- **Precondiciones:** paciente, sede, sillón y profesional activos.
- **Postcondiciones:** turno `PROGRAMADA`; notificación encolada.

**Flujo principal**

1. Recepción selecciona sede, profesional y fecha.
2. El sistema muestra disponibilidad por sillón y profesional.
3. Selecciona un hueco o crea un turno manual.
4. Elige paciente y procedimiento; se sugiere la duración.
5. Confirma; se validan solapamientos (RN-03/RN-04).
6. El turno se crea y se encola la confirmación (RF-11).

**Alternativas**

- **A1. Solapamiento:** se bloquea y se ofrecen horarios alternativos.
- **A2. Fuera de horario de sede:** se advierte y requiere autorización.
- **A3. Paciente con alerta crítica:** se muestra badge al confirmar.

---

## UC-09 · Gestionar estados del turno

- **Actores:** Recepcionista, Odontólogo.
- **Requisitos:** RF-10, RF-11.
- **Precondiciones:** turno existente.
- **Postcondiciones:** estado actualizado con historial inmutable.

**Flujo principal**

1. Recepción marca `CONFIRMADA` al responder el paciente.
2. Al llegar, marca `EN_SALA`.
3. El odontólogo marca `EN_ATENCION` al iniciar.
4. Al finalizar, marca `ATENDIDA`.
5. Cada transición se valida contra la matriz y se audita.

**Alternativas**

- **A1. Cancelación:** motivo obligatorio; se notifica al paciente.
- **A2. No-show:** manual o automático tras la gracia configurada.
- **A3. Transición inválida:** se rechaza con mensaje explicativo.

---

## UC-10 · Enviar recordatorios

- **Actores:** Sistema (job), Recepción (supervisa).
- **Requisitos:** RF-11, RNF-09.
- **Precondiciones:** turno confirmado o programado; paciente con canal habilitado.
- **Postcondiciones:** mensaje entregado o fallido; estado registrado.

**Flujo principal**

1. Un job busca turnos a 48 h y 24 h.
2. Verifica opt-out, ventana horaria y duplicados.
3. Renderiza la plantilla con datos mínimos.
4. Envía por el canal configurado.
5. Registra estado y reintenta ante fallo transitorio.

**Alternativas**

- **A1. Proveedor caído:** reintentos con backoff; fallback a email.
- **A2. Paciente sin contacto:** se marca para gestión manual.
- **A3. Duplicado:** se omite por idempotencia.

---

## UC-11 · Cobrar y emitir comprobante

- **Actores:** Recepcionista/Cajero.
- **Requisitos:** RF-12, RF-17, RN-02, RN-07, RN-10.
- **Precondiciones:** caja abierta en la sede; ítems a cobrar definidos.
- **Postcondiciones:** pago registrado; comprobante emitido; caja actualizada.

**Flujo principal**

1. Se cargan ítems del presupuesto o venta directa.
2. El sistema calcula total y saldo.
3. Se seleccionan uno o más medios de pago y montos.
4. Se valida que la suma no supere el total (RN-07).
5. Se confirma el cobro y se genera el comprobante.
6. Se imprime o envía por email.
7. El movimiento queda asociado a la caja y al turno.

**Alternativas**

- **A1. Pago parcial:** queda saldo pendiente explícito.
- **A2. Caja cerrada:** se bloquea el cobro.
- **A3. Pasarela rechaza:** se informa y se permite otro medio.
- **A4. Error de impresión:** se permite reimpresión auditada.

---

## UC-12 · Cerrar caja

- **Actores:** Cajero (conteo), Supervisor (aprobación).
- **Requisitos:** RF-17, RN-02.
- **Precondiciones:** caja abierta; movimientos del turno registrados.
- **Postcondiciones:** cierre aprobado; diferencias documentadas.

**Flujo principal**

1. El cajero inicia el cierre.
2. Ingresa el conteo físico por medio de pago **sin ver el total teórico**.
3. El sistema calcula y revela el total teórico y la diferencia.
4. Si hay diferencia, se exige observación.
5. El supervisor revisa y aprueba.
6. Se genera el reporte de cierre en PDF.

**Alternativas**

- **A1. Diferencia no justificada:** el supervisor puede rechazar el cierre.
- **A2. Reapertura:** excepcional, con motivo y auditoría.
- **A3. Caja ya cerrada:** no se permiten nuevos cobros.

---

## UC-13 · Registrar descargo de insumos

- **Actores:** Sistema (automático), Asistente dental, Administrador.
- **Requisitos:** RF-14, RN-06.
- **Precondiciones:** procedimiento marcado como `realizado`; BOM configurado.
- **Postcondiciones:** stock actualizado; movimiento auditado.

**Flujo principal**

1. Al completar el procedimiento, el sistema lee la receta de consumo.
2. Calcula cantidades según cantidad de procedimientos.
3. Verifica stock en la sede del turno.
4. Registra movimientos de salida y actualiza stock.
5. Si el stock cae bajo el mínimo, genera alerta.

**Alternativas**

- **A1. Stock insuficiente:** alerta; requiere autorización para continuar.
- **A2. Sin BOM:** no descuenta y notifica al administrador.
- **A3. Ajuste manual:** requiere motivo y permiso.

---

## UC-14 · Administrar usuarios, roles y sedes

- **Actores:** Administrador TI.
- **Requisitos:** RF-15, RF-16, RF-26, RNF-06.
- **Precondiciones:** sesión con rol administrador.
- **Postcondiciones:** usuario/rol/sede actualizado; auditoría registrada.

**Flujo principal**

1. El administrador crea o edita un usuario.
2. Asigna rol(es) y sede(s).
3. Configura MFA obligatoria según rol.
4. Guarda; el sistema invalida sesiones previas si cambiaron permisos.
5. Registra el cambio en auditoría.

**Alternativas**

- **A1. Último administrador:** no se puede desactivar.
- **A2. Rol con permisos insuficientes:** no se permite guardar una configuración inválida.
- **A3. Usuario con sesión activa:** se fuerza reautenticación.

---

## UC-15 · Consultar auditoría

- **Actores:** Auditor, Administrador TI.
- **Requisitos:** RF-18, RNF-07.
- **Precondiciones:** rol con permiso `auditoria:leer`.
- **Postcondiciones:** consulta registrada; exportación autorizada.

**Flujo principal**

1. El auditor filtra por rango de fechas, usuario, entidad y acción.
2. El sistema muestra resultados paginados.
3. Selecciona un evento y ve el detalle (valores anterior/nuevo).
4. Exporta a CSV si tiene permiso.
5. La propia consulta/exportación queda auditada.

**Alternativas**

- **A1. Rango excesivo:** se limita y se solicita acotar.
- **A2. Sin permisos:** se deniega y se registra el intento.

---

## UC-16 · Importar datos históricos

- **Actores:** Administrador TI, Analista de datos.
- **Requisitos:** RF-25.
- **Precondiciones:** plantilla validada; entorno staging disponible.
- **Postcondiciones:** lote importado o revertido; informe de errores.

**Flujo principal**

1. Se descarga la plantilla y se completa.
2. Se sube el archivo en modo simulación.
3. El sistema valida formato, duplicados y referencias.
4. Se revisa el informe y se corrigen errores.
5. Se ejecuta la importación real en transacción.
6. Se registra el lote y se notifica el resultado.

**Alternativas**

- **A1. Errores bloqueantes:** no se importa; se descarga el detalle.
- **A2. Falla a mitad:** rollback completo del lote.
- **A3. Duplicado idempotente:** se omite y se informa.

---

## UC-17 · Generar reporte operativo/financiero

- **Actores:** Auditor/Contador, Dirección, Administrador.
- **Requisitos:** RF-22, RF-23.
- **Precondiciones:** permisos de reporte; datos del período.
- **Postcondiciones:** reporte visualizado/exportado; consulta auditada.

**Flujo principal**

1. El usuario elige tipo de reporte, sede y período.
2. El sistema aplica filtros y permisos.
3. Muestra tabla/gráfico con totales.
4. Permite exportar CSV/PDF.
5. Registra la exportación en auditoría.

**Alternativas**

- **A1. Período sin datos:** se muestra estado vacío, no error.
- **A2. Exportación masiva:** se procesa en background y se notifica.

---

## UC-18 · Emitir receta digital

- **Actores:** Odontólogo.
- **Requisitos:** RF-21, RF-02.
- **Precondiciones:** paciente con alergias cargadas; catálogo de medicamentos.
- **Postcondiciones:** receta firmada, PDF generado y entrega registrada.

**Flujo principal**

1. El odontólogo agrega medicamentos con dosis, vía y duración.
2. El sistema valida alergias e interacciones configuradas.
3. El profesional firma.
4. Se genera el PDF con matrícula y datos de la clínica.
5. Se envía por el canal autorizado y se registra el estado.

**Alternativas**

- **A1. Alergia detectada:** bloqueo con justificación obligatoria.
- **A2. Sin contacto:** se entrega impreso.
- **A3. Anulación:** se registra motivo; la receta original se conserva.
