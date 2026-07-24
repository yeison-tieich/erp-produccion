# 02. Base de Datos - Modelo de Datos (Prisma)

El sistema utiliza **Supabase** como motor de base de datos principal, gestionado a través de **Prisma ORM**. A continuación se detallan los modelos principales y sus relaciones.

## Modelos Principales

### 1. Usuarios y Autenticación (`Usuario`)
- Almacena información de acceso y roles.
- **Roles**: `Administrador`, `Supervisor`, `Operario`.

### 2. Inventario y Materiales (`MateriaPrima`, `MovimientoInventarioMP`)
- Gestión de SKUs de materia prima (láminas, perfiles, etc.).
- Control de stock actual, reservado y punto de reorden.
- Seguimiento de movimientos (Ingresos, Consumos, Ajustes).

### 3. Producción y Órdenes (`Producto`, `OrdenTrabajo`, `TareaProduccion`)
- **Producto**: Definición técnica de piezas recurrentes, incluyendo BOM (Lista de Materiales) y rutas de fabricación.
- **Orden de Trabajo (OT)**: Ejecución de producción en serie o proyectos especiales.
- **Tarea de Producción**: Asignación de operaciones específicas de una OT a personal y máquinas.

### 4. Proyectos Especiales (`ProyectoEspecial`, `FaseProyecto`, `PiezaProyecto`)
- Modelo para trabajos no seriados (troqueles, moldes, reparaciones).
- Seguimiento detallado por **fases** (Diseño, Fabricación, Ajuste, etc.).
- Control de **piezas individuales** con sus propios planos y estados.
- Registro de historial de cambios y notas técnicas.

### 5. Recursos: Personal y Máquinas (`Personal`, `Maquina`)
- **Personal**: Datos de empleados, cargos, KPI de puntualidad y préstamos.
- **Máquinas**: Registro de activos, estado (Activo, Mantenimiento, Inactivo) y carga de trabajo asignada.

### 6. Mantenimiento y Herramientas (`MantenimientoPreventivo`, `HerramientaConsumible`, `PrestamoHerramienta`)
- Programación de mantenimientos preventivos.
- Control de inventario de herramientas y consumibles.
- Registro de préstamos activos y devueltos.

---

## Relaciones Clave
- **Producto -> ListaMateriales -> MateriaPrima**: Define qué materiales se necesitan para fabricar una pieza.
- **OrdenTrabajo -> TareaProduccion -> Personal/Maquina**: Controla quién y en qué máquina se realiza cada operación.
- **ProyectoEspecial -> FaseProyecto -> Personal/Maquina**: Similar a las tareas, pero estructurado para proyectos de larga duración.
- **Personal -> PrestamoHerramienta <- HerramientaConsumible**: Trazabilidad del uso de herramientas en la planta.

---

## Persistencia Local (Mobile)

Para garantizar la funcionalidad sin conexión, la aplicación móvil mantiene un espejo local de las tablas críticas.

### Tablas Locales (Capacitor SQLite)
- **MateriaPrima**: Copia del inventario para consultas rápidas y validaciones.
- **MovimientoInventarioMP**: Registra ingresos y consumos realizados en campo.
- **OrdenTrabajo**: Permite visualizar y gestionar OTs asignadas.
- **Tareas**: Permite iniciar/finalizar operaciones de manufactura offline.
- **SyncQueue**: Tabla técnica que almacena las operaciones pendientes de subir al servidor (`INSERT`, `UPDATE`, `DELETE`).

---

## Configuración del Sistema (`Configuracion`)
- Almacena variables globales como la densidad del acero por defecto y horas de turno.
