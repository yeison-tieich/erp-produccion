# Manual de pruebas - Control MT

## 1. Objetivo

Este documento establece el procedimiento para probar cambios del sistema antes de subir a producción. La validación debe ser clara, repetible y documentada.

## 2. Tipos de prueba

### 2.1 Pruebas funcionales

Validan que la funcionalidad implementada cumpla el requerimiento:

- login,
- creación de OT,
- actualización de inventario,
- búsqueda y filtros,
- carga de archivos,
- generación de reportes.

### 2.2 Pruebas de integración

Validan que diferentes módulos funcionen juntos:

- inventario + producción,
- OT + módulos de personal y máquinas,
- calidad + reclamos + productos,
- frontend + backend + base de datos.

### 2.3 Pruebas de regresión

Se revisan flujos críticos que no deben romperse:

- autenticación,
- navegación principal,
- consultar y guardar información,
- despliegue de datos importantes.

## 3. Checklist obligatorio antes de prueba

- entorno preparado,
- usuario válido disponible,
- datos de prueba definidos,
- base funcionando,
- backend y frontend levantados,
- módulo afectado identificado,
- caso de prueba documentado.

## 4. Procedimiento paso a paso

### Paso 1: definir el caso

Describir:

- nombre del caso,
- objetivo,
- usuario o rol que lo ejecuta,
- datos usados,
- resultado esperado.

### Paso 2: ejecutar prueba

1. abrir la funcionalidad en el entorno correcto,
2. ejecutar la acción con datos reales o de prueba,
3. observar si hay errores de front, backend o datos,
4. documentar resultado.

### Paso 3: verificar el resultado

Confirmar:

- la operación se ejecutó correctamente,
- la información quedó guardada,
- los estados y cálculos son correctos,
- los mensajes de error o confirmación son claros,
- el sistema responde sin bloqueos.

### Paso 4: registrar evidencia

Guardar:

- URL o entorno utilizado,
- usuario de prueba,
- fecha,
- capturas o notas,
- resultado final: aprobado/rechazado.

## 5. Casos críticos a probar cada cambio

- login y permisos,
- crear/editar registro clave,
- eliminar o desactivar información crítica,
- flujo de inventario y stock,
- flujo de OTs y producción,
- archivos y documentos,
- API con datos ambientales reales.

## 6. Criterio de aprobación

Una prueba se aprueba si:

- no presenta errores funcionales críticos,
- el flujo principal funciona sin interrupciones,
- la información se guarda y consulta correctamente,
- el comportamiento coincide con el requerimiento.

## 7. Rechazo y corrección

Si falla una prueba:

1. documentar la causa,
2. entregar evidencia a quien correige,
3. corregir la causa raíz,
4. repetir el caso de prueba,
5. solo aprobar cuando quede validado.

## 8. Recomendación final

Cada cambio debe pasar por prueba ejecutada, documentada y aprobada. No se sube a producción sin evidencia funcional.
