# 03. Guía de Módulos - Control MT

La aplicación se estructura por módulos funcionales que responden a la operación real de una planta metalmecánica. Los módulos están conectados al mismo modelo de datos y comparten autenticación, seguridad y dashboards de análisis.

## 1. Dashboard y métricas

El dashboard central ofrece una vista operativa del estado general del negocio:

- producción actual y acumulada
- inventario crítico y niveles de stock
- OT pendientes, atrasadas o entregadas
- recursos de personal y máquinas
- alertas por mantenimiento y calidad
- indicadores de desempeño por área

Se usa como panel ejecutivo para seguimiento diario y toma de decisiones.

## 2. Inventario de materia prima

Módulo de control de materiales:

- carga y actualización de SKU de respaldo y materiales
- cálculo de stock real, reservado y punto de reorden
- movimientos de entrada, salida, ajuste y devoluciones
- gestión por categoría, unidad y costo
- trazabilidad del consumo por producto y orden de trabajo

Este módulo está estrechamente ligado a `MateriaPrima`, `MovimientoInventarioMP` y `ListaMateriales`.

## 3. Productos y catálogo

Gestiona los productos terminados o semielaborados:

- código, nombre, descripción y cliente asociado
- medidas, ubicaciones, acabado y stock
- BOM por producto con materiales requeridos
- rutas de fabricación y tiempos estándar
- planos, imágenes y documentación técnica asociada

Este módulo se usa como base para la producción en serie y la planificación por OT.

## 4. Órdenes de trabajo (OT)

Módulo central de producción:

- creación de OT por producto, proyecto o requerimiento
- asignación de cantidades, prioridad y fecha de entrega
- control de estado por producción, control o entrega
- tareas por operación con personal y máquina asociados
- seguimiento de avance, costo estimado y trazabilidad

La OT es el punto de unión entre inventario, personal, máquinas y calidad.

## 5. Proyectos especiales

Para trabajos no estándar o de ingeniería:

- seguimiento de fases y piezas
- control de avances por proyecto
- revisión de estados técnicos, restricciones y entrega
- documentación visual, comentarios y trazabilidad

El módulo es útil para troqueles, moldes, trabajos especiales y proyectos con requerimientos no repetitivos.

## 6. Personal y horas laborales

Administra la parte operativa del recurso humano:

- registro de personal, cargo y área
- cálculo de productividad y KPI
- registro de horas y costo por actividad
- dotación, EPP y control de prestaciones

Este módulo se conecta directamente con tareas, producción y mantenimiento.

## 7. Máquinas y mantenimiento

Control de activos productivos:

- registro de máquinas, operación y estados
- programación y seguimiento de mantenimiento preventivo
- relación con tareas y rutas de producción
- soporte para análisis de carga operativa

## 8. Calidad, inspección y no conformidades

Se usa para asegurar control del producto final o intermedio:

- inspecciones por cliente, producto o proceso
- registros de no conformidad y acciones correctivas
- riesgos de calidad y reclamos
- trazabilidad de fallos en producción o entrega

## 9. Herramientas y préstamos

Módulo complementario para control de herramienta en planta:

- catálogo de herramientas y consumibles
- gestión de préstamos y devoluciones
- seguridad de uso y disponibilidad
- control de dotación personal

## 10. Finanzas y pedidos

Incluye parte del flujo comercial y financiero:

- pedidos y relaciones con clientes
- seguimiento comercial e historial
- manejo de movimientos de inventario y costos asociados
- preparación de reportes y análisis financiero

## 11. Configuración y administración

Módulo de administración general:

- roles y permisos de usuario
- configuración operacional del negocio
- ajuste de variables globales de entorno y negocio
- parametrización de procesos y dominio del sistema

## Relación entre módulos

Los módulos no son independientes; todos convergen en la operación productiva:

- plan de producción → OT → inventario → tareas → personal/maquina
- clientes → productos → pedidos → producción → entrega
- calidad → reclamos → acciones → mejora continua
- proyectos → fases → piezas → documentación → control operativo

## Conclusión

El ERP está pensado para cubrir la operación completa de una planta metalmecánica, integrando producción, inventario, mantenimiento, calidad y administración dentro del mismo ecosistema funcional y de datos.

