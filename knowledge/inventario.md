# Módulo de Inventario

Este documento detalla el funcionamiento del módulo de inventario de materias primas en el sistema.

## Modelos de Datos Principales

El módulo de inventario se basa en dos modelos de datos fundamentales en la base de datos:

1.  **`MateriaPrima`**: Representa cada uno de los artículos de inventario (materias primas).
    *   **Campos Clave**:
        *   `sku_mp`: Identificador único de producto (SKU).
        *   `nombre_mp`: Nombre del material.
        *   `categoria_mp`: Categoría a la que pertenece (ej: "Lámina", "Perfil", "Tornillería").
        *   `unidad_medida_stock`: Unidad en la que se mide el stock (ej: "kg", "unidades", "metros").
        *   `stock_actual`: Cantidad actual disponible en el inventario.
        *   `stock_reservado`: Cantidad reservada para órdenes de trabajo pendientes.
        *   `punto_reorden`: Nivel de stock mínimo que dispara una alerta para comprar más.
        *   `costo_unitario`: Costo por unidad del material.
        *   Propiedades físicas como `espesor`, `ancho`, `largo`, `densidad` para cálculos de peso.

2.  **`MovimientoInventarioMP`**: Registra cada transacción que afecta el stock de una `MateriaPrima`. Esto proporciona un historial completo y trazabilidad.
    *   **Campos Clave**:
        *   `materia_prima_id`: Vincula el movimiento al material correspondiente.
        *   `tipo_movimiento`: Describe la naturaleza de la transacción.
        *   `cantidad`: La cantidad que se sumó (positivo) or se restó (negativo) del stock.
        *   `referencia_id`: Un ID de referencia para la transacción (ej: número de orden de compra, ID de ajuste).
        *   `orden_trabajo_id`: Si el material fue consumido en producción, se vincula a la orden de trabajo.
        *   `imagen_remision_url`: URL de la imagen del documento de soporte (ej: remisión de entrega).

## Funcionalidades Principales

### 1. Gestión de Materiales

El sistema permite la Creación, Lectura, y Actualización (CRUD) de materias primas. Esto se gestiona a través del formulario de materiales (`MaterialForm.tsx` en el frontend). La creación de un nuevo material requiere información detallada para asegurar la correcta clasificación y cálculos posteriores.

### 2. Manejo de Stock

Las operaciones de stock son controladas y requieren permisos especiales (roles de `Administrador` o `Supervisor`).

*   **Entradas de Stock (`Ingreso Compra`)**:
    *   Se realiza a través del modal "Añadir Stock" (`AddStockModal.tsx`).
    *   Permite registrar la cantidad de material que ingresa por una compra.
    *   Se puede adjuntar una imagen de la remisión del proveedor como evidencia.
    *   Cada entrada genera un movimiento de tipo `Ingreso Compra`.

*   **Ajustes Manuales**:
    *   Permite corregir discrepancias en el inventario.
    *   Puede ser una cantidad positiva (si se encontró material no registrado) o negativa (por pérdidas o daños).
    *   Genera un movimiento de tipo `Ajuste`.

*   **Consumo para Producción**:
    *   Aunque no se gestiona directamente en la sección de "Inventario", el sistema descuenta automáticamente el stock de `MateriaPrima` cuando se utiliza en una `OrdenTrabajo`.
    *   Este proceso genera un movimiento de tipo `Consumo` (implícito), vinculando el consumo a la orden de trabajo específica.

### 3. Trazabilidad y Auditoría

*   **Historial de Movimientos**: Es posible consultar el historial completo de entradas, salidas y ajustes para cualquier material. Esto permite una auditoría detallada y ayuda a identificar discrepancias.
*   **Reversión de Movimientos**: Si se comete un error (ej: se registra una entrada con una cantidad incorrecta), el sistema permite "revertir" el movimiento. Esto no borra el registro original, sino que crea un nuevo movimiento de tipo `Reversión / Devolución` con la cantidad opuesta, manteniendo la integridad del historial.

### 4. Reportes y Estadísticas

La sección de inventario incluye un panel de estadísticas (`InventoryStats.tsx`) que muestra métricas clave, como el número de movimientos de ingreso en el mes actual, para dar una visión rápida de la actividad del inventario.

## Endpoints de la API (`/api/inventory`)

*   `GET /`: Obtiene la lista de todas las materias primas.
*   `POST /`: Crea una nueva materia prima.
*   `PUT /:id`: Actualiza los datos de una materia prima existente.
*   `GET /stats`: Obtiene estadísticas del inventario.
*   `GET /:id/movements`: Obtiene el historial de movimientos para un material específico.
*   `POST /:id/add-stock`: Añade stock a un material (Ingreso por Compra).
*   `POST /:id/adjust-stock`: Realiza un ajuste manual de stock.
*   `POST /movements/:id/reverse`: Revierte un movimiento de inventario existente.
*   `POST /upload-remission`: Sube la imagen de una remisión.
