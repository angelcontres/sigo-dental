# Plantilla de historia de usuario

| Campo | Valor |
|---|---|
| ID | HU-xx |
| Épica | |
| Módulo | MD-xx |
| Prioridad | Must / Should / Could |
| Etapa | E1 / E2 / E3 / E4 |
| Requisitos | RF-xx, RN-xx |
| Estimación | (puntos) |

---

## Historia

**Como** _(rol)_
**quiero** _(acción / capacidad)_
**para** _(beneficio / valor)_.

## Contexto

_(Por qué existe esta historia, qué problema resuelve, qué pasa hoy.)_

## Criterios de aceptación (Gherkin)

```gherkin
Escenario: <nombre>
  Dado <contexto inicial>
  Cuando <acción del usuario o del sistema>
  Entonces <resultado observable>
  Y <otra condición verificable>
```

```gherkin
Escenario: <caso alternativo o error>
  Dado ...
  Cuando ...
  Entonces ...
```

## Reglas de negocio aplicables

- RN-xx:

## Diseño de referencia

- Documento: `docs/SDD/04-diseno-funcional/...`
- Pantalla / componente:
- Contrato de API:

## Datos y permisos

- Datos que lee/escribe:
- Roles autorizados:
- Restricciones por sede:

## Definition of Ready

- [ ] Criterios de aceptación claros y verificables.
- [ ] Dependencias identificadas.
- [ ] Diseño de UI/API disponible.
- [ ] Datos de prueba definidos.
- [ ] Estimada por el equipo.

## Definition of Done

- [ ] Código revisado y mergeado.
- [ ] Pruebas unitarias e integración verdes.
- [ ] Criterios de aceptación demostrados.
- [ ] Documentación/OpenAPI actualizados.
- [ ] Sin hallazgos de seguridad altos.
- [ ] Desplegado en staging y validado por QA.
