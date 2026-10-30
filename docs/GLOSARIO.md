# Glosario — SIGO-Dental

Vocabulario compartido entre el equipo clínico, administrativo y técnico. Si un término
no está aquí y se usa en el SRS o en el SDD, debe agregarse.

---

## A

**Adenda clínica.** Nota adicional que corrige o amplía un registro clínico ya firmado.
No modifica el registro original (ver `RN-01`).

**Agenda / turno.** Bloque de tiempo reservado para atender a un paciente con un
profesional en un sillón determinado.

**Anamnesis.** Conjunto de antecedentes médicos, quirúrgicos, farmacológicos y familiares
del paciente, obtenidos en la primera consulta y actualizados en cada visita.

**Auditoría (log de).** Registro append-only de acciones sobre datos sensibles: quién,
qué, cuándo, desde dónde y sobre qué registro.

## B

**Badge de alerta.** Indicador visual de alta visibilidad en la cabecera del expediente que
señala condiciones críticas (alergias, anticoagulación, embarazo, etc.).

**Bounded context.** Límite explícito dentro del cual un modelo de dominio es válido y
consistente. Base de la modularización del backend.

## C

**Cierre de caja.** Proceso diario en el que se concilia el efectivo físico contado con los
movimientos registrados. En SIGO-Dental es "ciego" (`RN-02`).

**Consentimiento informado.** Documento legal que el paciente (o su tutor) firma antes de un
procedimiento, declarando que comprendió riesgos, beneficios y alternativas.

**CUI / CUIT / RUC / NIT.** Identificador fiscal del paciente o de la clínica según el país.
El campo se modela como `tax_id` con validación configurable.

## D

**DICOM.** Estándar de imágenes médicas. En Fase 1 solo se almacenan y visualizan archivos;
la integración PACS es futura.

**Dentición decidua (temporal).** 20 dientes de leche.

**Dentición permanente.** 32 dientes.

**Descargo de insumos.** Deducción automática de stock al completar un procedimiento, según
la receta estándar de consumo (`RF-14`).

## E

**Expediente clínico.** Conjunto de datos, notas, imágenes y documentos de la atención de un
paciente. En SIGO-Dental es único por paciente y transversal a sedes.

## F

**FDI.** Notación dental internacional de dos dígitos (cuadrante + diente). Ej.: `3.6` o `36`.

**Firma digital.** Mecanismo que vincula una acción con un profesional autenticado. En Fase 1:
firma electrónica simple con hash, sello de tiempo y traza de auditoría; la firma con
certificado digital queda como evolución.

**Furca.** Zona de bifurcación de las raíces de dientes multirradiculares; se registra su
compromiso en el periodontograma.

## M

**MFA.** Autenticación multifactor. En SIGO-Dental: contraseña + TOTP (o código por email).

**MoSCoW.** Técnica de priorización: Must, Should, Could, Won't.

## N

**NIC.** Nivel de inserción clínica = margen gingival + profundidad de sondaje.

**No-show.** Paciente que no asistió a un turno sin cancelarlo.

## O

**Odontograma.** Representación gráfica del estado de cada pieza dental y sus superficies.

**OTP.** Código de un solo uso, enviado por email/SMS, usado para MFA o para validar la
firma de un consentimiento.

## P

**PACS.** Picture Archiving and Communication System. Repositorio de imágenes médicas.

**Periodontograma.** Registro de seis sitios por diente (profundidad de sondaje, margen
gingival, sangrado, movilidad, furca).

**Presupuesto.** Propuesta económica de un plan de tratamiento, con ítems, fases y
descuentos. Puede aprobarse total o parcialmente.

**Procedimiento.** Prestación odontológica del catálogo (ej.: "restauración de resina",
"endodoncia unirradicular"). Tiene precio, duración y consumo estándar de insumos.

## R

**RBAC.** Control de acceso basado en roles.

**RTO / RPO.** Recovery Time Objective / Recovery Point Objective: cuánto tiempo puede
estar caído el sistema y cuánta información se puede perder como máximo.

## S

**Sillón / consultorio.** Recurso físico donde se atiende. No pueden solaparse dos citas en
el mismo sillón (`RN-03`).

**SOEP.** Formato de nota clínica: Subjetivo, Objetivo, Evaluación, Plan.

**SRS.** Software Requirements Specification.

**SDD.** Software Design Document.

## T

**Timbrado / facturación electrónica.** Proceso de emisión de comprobantes fiscales
autorizados por la autoridad tributaria del país.

**Tutor legal.** Adulto responsable de un paciente menor de edad o incapaz; firma
consentimientos y autoriza tratamientos.

## U

**Universal (notación).** Numeración dental americana del 1 al 32 (permanente) y A–T
(decidua).

## V

**Vitalidad pulpar.** Estado de sensibilidad/viabilidad del nervio dental, registrado en el
odontograma.
