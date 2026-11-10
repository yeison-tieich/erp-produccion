# Manual de modo de trabajo - Control MT

## 1. Objetivo

Este manual establece el modo de operación del equipo para trabajar de forma ordenada, segura y repetible en desarrollo, pruebas y producción.

## 2. Principios del modo de trabajo

1. No se hacen cambios directos sobre producción sin validar.
2. Todo cambio debe estar asociado a una tarea o corrección definida.
3. La validación se realiza en entorno de pruebas antes de desplegar.
4. La documentación del cambio debe quedar presente en el repositorio.
5. Cada despliegue debe ser trazable con versión, fecha y responsable.

## 3. Flujo recomendado por etapa

### Desarrollo

- crear una rama por funcionalidad o corrección
- trabajar en local o en un entorno aislado
- validar el comportamiento antes de enviar a pruebas
- usar commits pequeños y descriptivos

### Pruebas

- hacer validación funcional con datos controlados
- revisar los módulos afectados
- verificar que no se rompa flujo principal del ERP
- aprobar o rechazar según criterio funcional y técnico

### Producción

- solo se despliega lo validado
- se respalda la base y el estado anterior
- se verifica el sistema después del deploy
- se mantiene registro del cambio realizado

## 4. Ramas sugeridas

Usar una estructura simple y clara:

- `main` — producción
- `develop` — integración y pruebas
- `feature/nombre` — nuevas funcionalidades
- `fix/nombre` — correcciones de bugs
- `hotfix/nombre` — correcciones urgentes sobre producción

## 5. Convención de trabajo

### Commits

Usar mensajes claros, cortos y descriptivos:

- `feat: agregar flujo de inventario por materiales`
- `fix: corregir cálculo de stock reservado`
- `chore: actualizar documentación de despliegue`

### Pull request

Antes de merge:

- revisar cambios,
- verificar pruebas,
- confirmar que no hay caché o archivos temporales,
- dejar comentarios claros para el aprobador.

## 6. Reglas del equipo

- no usar entorno de producción para pruebas diarias,
- no mezclar cambios ajenos sin revisión,
- no subir secretos ni `.env` al repositorio,
- no cancelar validaciones funcionales sin completar evidencia,
- no publicar una versión sin backup y revisión.

## 7. Ciclo de cambio recomendado

1. identificar requerimiento o corrección,
2. crear rama y documentar el alcance,
3. desarrollar la solución,
4. ejecutar pruebas locales,
5. probar en entorno de pruebas,
6. revisar con responsable del área,
7. subir a producción,
8. verificar funcionamiento real,
9. cerrar la tarea con evidencia.

## 8. Registro del trabajo

Todo cambio debe dejar evidencia de:

- qué se modificó,
- por qué se modificó,
- quién lo aprobó,
- en qué entorno se validó,
- qué resultado tuvo,
- qué versión quedó en producción.

## 9. Recomendación final

La disciplina del modo de trabajo es la que evita errores costosos. La clave está en separar claramente desarrollo, pruebas y producción, y en exigir validación antes de cada release.
