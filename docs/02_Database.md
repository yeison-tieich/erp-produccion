# 02. Base de Datos - Modelo de Datos (Prisma)

La base de datos del sistema se gestiona con PostgreSQL usando Prisma como ORM. El modelo refleja la estructura de producción industrial, con entidades para clientes, productos, inventario, órdenes de trabajo, personal, mantenimiento, proyectos especiales, calidad y configuración del negocio.

## Configuración técnica

El datasource del proyecto se define en `backend/prisma/schema.prisma` como:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Esto significa que la base de datos principal del ERP es PostgreSQL, no SQLite. Las migraciones y los scripts deben respetar este motor.

## Modelos principales

### 1. Usuarios y seguridad (`Usuario`)
- `id`, `nombre`, `email`, `password_hash`, `rol`, `activo`
- Relación opcional con `Personal`
- Soporta permisos y configuración por usuario
- Historial de cambios asociado a acciones del sistema

### 2. Inventario y materiales (`MateriaPrima`)
- SKU, nombre, categoría, unidades de medida
- `stock_actual`, `stock_reservado`, `devoluciones`, `punto_reorden`
- `densidad`, `peso_unitario`, `costo_unitario`
- Movimientos de entrada/salida/ajuste a través de `MovimientoInventarioMP`

### 3. Productos y BOM (`Producto`, `ListaMateriales`)
- `sku_producto`, `nombre_producto`, `descripcion`, `cliente_id`
- `stock_actual`, `stock_minimo`, `stock_maximo`, `precio_venta`
- `fuerza_troquelado` (Ton), dimensiones, acabado y piezas obtenidas por formato de lámina
- relación con `ListaMateriales` y `RutaFabricacion`
- soporte de planos, imagen, medidas y proceso productivo

### 4. Producción y OT (`OrdenTrabajo`, `TareaProduccion`, `RutaFabricacion`)
- OTs con número único, fechas, prioridad, cantidad, estado y entregas
- relación con productos, cliente y tareas de producción
- asignación de trabajo por máquina y personal
- trazabilidad del proceso productivo y tiempos

### 5. Personal y capacity (`Personal`, `RegistroTiempoLaboral`)
- datos personales, cargo, área, KPI, costo por hora, productividad
- tiempos laborales, dotación, permisos, asistencia y costo asociado
- soporte de operaciones y asignación de tareas

### 6. Máquinas y mantenimiento (`Maquina`, `MantenimientoPreventivo`)
- activos de producción, estado, mantenimiento y carga de trabajo
- programación de mantenimientos preventivos
- correlación con tareas y producción

### 7. Proyectos especiales (`ProyectoEspecial`, `FaseProyecto`, `PiezaProyecto`)
- trabajo no seriado, custom o de ingeniería
- seguimiento por fases, piezas y avance operativo
- documentación técnica y trazabilidad de entregas

### 8. Calidad (`InspeccionCalidad`, `NoConformidad`, `RiesgoCalidad`, `ReclamoCliente`)
- inspecciones por producto o proyecto
- no conformidades y acciones correctivas
- evaluación de riesgos y reclamos del cliente

### 9. Herramientas, préstamos y bienes de taller (`HerramientaConsumible`, `PrestamoHerramienta`, `DotacionEPP`)
- catálogo de herramientas, consumibles y prestamos
- control de disponibilidad y devoluciones
- dotación personal y seguimiento de EPP

### 10. Configuración del negocio (`Configuracion`, `ConfiguracionUsuario`)
- parámetros globales: densidades, horas de turno, ajustes por empresa
- configuración del sistema y personalización de la operativa

## Relaciones clave

- `Producto` → `ListaMateriales` → `MateriaPrima`
- `Producto` → `RutaFabricacion` → `TareaProduccion`
- `OrdenTrabajo` → `TareaProduccion` → `Personal` / `Maquina`
- `Cliente` → `Producto` / `Pedido` / `ReclamoCliente`
- `Personal` → `PrestamoHerramienta` / `RegistroTiempoLaboral`
- `Maquina` → `TareaProduccion` / `MantenimientoPreventivo`
- `ProyectoEspecial` → `FaseProyecto` → `PiezaProyecto`

## Migraciones y evolución del esquema

El repositorio usa Prisma Migrations para versionar la base de datos. Es importante:

- no crear cambios de esquema directamente en producción sin revisión
- validar el estado del esquema en staging antes de deploy
- hacer backup antes de migraciones de producción
- respetar el historial de migraciones en lugar de forzar `db push` en entorno operativo

## Soporte de sincronización móvil

El frontend móvil o web nativo puede usar almacenamiento local con SQLite para permitir trabajo offline. Esto no reemplaza el PostgreSQL de backend, sino que complementa la administración local de cambios en la app antes de enviarlos al servidor.

## Referencias del proyecto

- `backend/prisma/schema.prisma`
- `backend/src/routes/*.routes.ts`
- `backend/src/server.ts`
- `docs/07_Despliegue_Servidor_Propio.md`
