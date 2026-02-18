# Checkpoint - Proyecto CONTROL MT
**Fecha:** 16 de Febrero de 2026

## 🎯 Estado Actual del Proyecto

El sistema ERP de control de producción "Control MT" ha alcanzado un estado funcional avanzado con los siguientes módulos completados y estabilizados:

### 1. Gestión de Órdenes de Trabajo (OT)
*   **Acciones Rápidas:** Implementación de 4 botones clave: Editar, Duplicar, Cambiar Estado y Ver Detalles.
*   **Trazabilidad Técnica:** Panel de detalles que muestra:
    *   Registro de tiempos (Inicio/Fin) por operación.
    *   Control de calidad por proceso (Piezas buenas vs. Scrap).
    *   Cálculo automático de costo real y duración total.
*   **Generación Automática:** Al crear una OT, se generan automáticamente las tareas basadas en la ruta de fabricación del producto.

### 2. Control de Personal y Administrativo
*   **Seguridad de Datos:** Salarios ocultos en la vista general, visibles solo en el panel de detalles administrativo.
*   **Gestión de Tiempos:** Módulo de registro de Horas Extras, Permisos e Incapacidades.
*   **Filtros Avanzados:** Filtro por rango de fechas para el control de novedades de tiempo.
*   **Seguridad Industrial (EPP):** Registro formal de entrega de dotación (Guantes de Vaqueta, Nitrilo, Botas, etc.) con historial por trabajador.
*   **KPIs:** Visualización de Puntualidad, Eficiencia y Productividad por operario.

### 3. Base de Datos y Backend
*   **Esquema Prisma:** Modelos actualizados para `Personal`, `RegistroTiempoLaboral` y `DotacionEPP`.
*   **Sincronización:** Base de datos SQLite mapeada y sincronizada.
*   **Seeding:** Cargados 18 operarios y rutas de fabricación detalladas para productos estratégicos.

## 🚀 Instrucciones para Reiniciar la App

### Backend
```powershell
cd backend
npm run dev
```
*Corre en: http://localhost:3000*

### Frontend
```powershell
cd frontend
npm run dev
```
*Corre en: http://localhost:5173*

## 🔑 Credenciales de Acceso
*   **Email:** admin@controlmt.com
*   **Password:** 123456

---
**Punto de Control Guardado.** El sistema está listo para operar en planta con control total de personal y trazabilidad técnica de procesos.
