# Módulo de Herramientas y Consumibles

Este documento detalla el funcionamiento del módulo de gestión de herramientas, equipos y consumibles, incluyendo el sistema de préstamos al personal.

## Modelos de Datos

1.  **`HerramientaConsumible`**: Representa un ítem individual que puede ser una herramienta (ej. Taladro, Calibrador) o un consumible (ej. Brocas, Discos de corte).
    *   **Campos Clave**:
        *   `codigo`: Identificador único opcional para el ítem.
        *   `nombre`: Nombre descriptivo del ítem.
        *   `tipo`: Categoría del ítem (ej. "Herramienta Manual", "Equipo de Medición", "Consumible").
        *   `cantidad_total`: El número total de unidades que posee la empresa.
        *   `cantidad_disponible`: El número de unidades que están actualmente en el almacén y disponibles para préstamo.
        *   `estado`: Un indicador visual del estado de disponibilidad:
            *   `DISPONIBLE`: Todas las unidades están en el almacén.
            *   `PARCIALMENTE EN USO`: Algunas unidades han sido prestadas.
            *   `EN USO`: Todas las unidades han sido prestadas.
        *   `ubicacion`: Lugar físico donde se almacena el ítem.

2.  **`PrestamoHerramienta`**: Registra la transacción de un préstamo de un ítem a un miembro del personal.
    *   **Campos Clave**:
        *   `herramienta_id`: Vincula el préstamo al ítem correspondiente.
        *   `personal_id`: Vincula el préstamo al empleado que lo recibe.
        *   `cantidad`: Número de unidades prestadas.
        *   `fecha_prestamo`: Fecha y hora en que se realizó el préstamo.
        *   `fecha_devolucion`: Fecha y hora en que se retornó el ítem.
        *   `estado`: Estado actual del préstamo:
            *   `ACTIVO`: El préstamo está en curso; el ítem no ha sido devuelto.
            *   `DEVUELTO`: El ítem ha sido retornado al almacén.
        *   `observaciones`: Notas adicionales sobre el préstamo o la devolución.

## Funcionalidades Principales

### 1. Inventario de Herramientas

El sistema permite realizar un CRUD (Crear, Leer, Actualizar, Borrar) completo para los ítems del inventario de herramientas y consumibles. Esto permite mantener un catálogo actualizado de todos los recursos disponibles.

*   **API Endpoints (`/api/tools`)**:
    *   `GET /`: Obtiene la lista de todas las herramientas y consumibles.
    *   `GET /:id`: Obtiene los detalles de un ítem específico, incluyendo su historial de préstamos.
    *   `POST /`: Crea un nuevo ítem en el inventario.
    *   `PUT /:id`: Actualiza la información de un ítem.
    *   `DELETE /:id`: Elimina un ítem del inventario.

### 2. Sistema de Préstamos

El núcleo del módulo es el sistema de control de préstamos, que automatiza el seguimiento de quién tiene qué.

*   **Prestar Herramienta**:
    *   Un usuario autorizado puede registrar la salida de una o más unidades de un ítem a nombre de un miembro del personal.
    *   El sistema verifica automáticamente si hay `cantidad_disponible` suficiente.
    *   Si el préstamo es exitoso, se crea un registro de `PrestamoHerramienta` con estado `ACTIVO`.
    *   La `cantidad_disponible` del ítem se reduce y su `estado` se actualiza (`PARCIALMENTE EN USO` o `EN USO`).

*   **Devolver Herramienta**:
    *   Cuando el empleado retorna el ítem, se registra la devolución en el sistema.
    *   El registro de `PrestamoHerramienta` correspondiente se actualiza a estado `DEVUELTO` y se anota la `fecha_devolucion`.
    *   La `cantidad_disponible` del ítem se incrementa y su `estado` se recalcula.

### 3. Trazabilidad y Control

Al seleccionar un ítem del inventario, el sistema muestra su historial completo de préstamos. Esto permite saber:
*   Quién tiene actualmente el ítem.
*   Quiénes lo han usado en el pasado.
*   Las fechas y observaciones de cada préstamo.

Esto mejora significativamente la responsabilidad y reduce la pérdida de herramientas y equipos.

*   **API Endpoints (`/api/loans`)**:
    *   `GET /`: Obtiene una lista de todos los préstamos (puede filtrarse por estado, ej. "ACTIVO").
    *   `POST /lend`: Registra un nuevo préstamo.
    *   `POST /return/:id`: Registra la devolución de un préstamo existente.
