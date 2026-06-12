# 03. Guía de Módulos - Control MT

El sistema se divide en varios módulos funcionales diseñados para cubrir las necesidades operativas y administrativas de la planta.

## 1. Dashboard y Métricas
- **Vista General**: Indicadores clave de desempeño (KPIs) en tiempo real.
- **Gráficos**: Visualización de producción mensual, eficiencia por operario y estado actual de las máquinas.
- **Alertas**: Notificaciones de sobrecarga, retrasos en proyectos y mantenimientos vencidos.

## 2. Inventario (Almacén)
- **Materia Prima**: Registro de SKUs (Láminas, Perfiles, Varillas) con sus dimensiones y propiedades.
- **Cálculo de Peso**: El sistema calcula automáticamente el peso basado en dimensiones y densidad.
- **Movimientos**: Registro trazable de entradas (compras) y salidas (consumo por OT).
- **Control de Retazos**: Gestión de material sobrante reutilizable.

## 3. Órdenes de Trabajo (OT)
- **Producción en Serie**: Creación de OTs basadas en productos predefinidos.
- **Smart PO PDF Reader**: Extracción automática de datos de órdenes de compra en PDF usando IA.
- **Automatización**: Generación de rutas de fabricación automáticas e impresión de etiquetas.
- **Reportes**: Generación de archivos PDF detallados (Orden de Trabajo) con BOM y rutas.

## 4. Proyectos Especiales
- **Seguimiento por Fases**: Control detallado para proyectos complejos como moldes o troqueles.
- **Cronograma y Carga**: Visualización de carga de máquinas por semana.
- **Captura de Fotos**: Posibilidad de subir o tomar fotos de referencia directamente desde el dispositivo.
- **Gestión de Piezas**: Control individual de cada una de las piezas que componen el proyecto.

## 5. Personal y Mantenimiento
- **Personal**: Control de asistencia, horas extras, permisos e incapacidades.
- **Mantenimiento**: Planes preventivos con alertas automáticas por frecuencia de días para cada máquina.
- **Consumibles de Máquina**: Seguimiento de vida útil de partes críticas.

## 6. Herramientas y Préstamos
- **Catálogo de Herramientas**: Inventario de herramientas compartidas y consumibles de taller.
- **Préstamos Activos**: Registro de entrega y devolución de herramientas a operarios para evitar pérdidas.
- **Estado de Herramientas**: Control de disponibilidad y necesidad de reparación.
