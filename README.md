
# Control MT - ERP de Producción

Sistema de gestión de producción para el control de Órdenes de Trabajo, Inventario y Tareas de Planta.

## Requisitos Previos

- Node.js (v18 o superior)
- npm

## Instrucciones de Instalación

1.  **Backend**
    ```bash
    cd backend
    npm install
    npx prisma generate
    npx prisma migrate dev --name init
    node prisma/seed.js
    ```

2.  **Frontend**
    ```bash
    cd frontend
    npm install
    ```

## Cómo Ejecutar la Aplicación

Necesitas abrir dos terminales:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```
El servidor correrá en `http://localhost:3000`.

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
La aplicación abrirá en `http://localhost:5173`.

## Credenciales de Acceso (Demo)

El sistema viene precargado con los siguientes usuarios:

| Rol | Email | Contraseña |
| --- | --- | --- |
| **Administrador** | admin@controlmt.com | 123456 |
| **Supervisor** | supervisor@controlmt.com | 123456 |
| **Operario** | operario@controlmt.com | 123456 |

## Funcionalidades Principales

- **Admin/Supervisor**:
    - Dashboard con KPIs.
    - Gestión de Inventario (Ver stock, Ingreso de material).
    - Gestión de Órdenes de Trabajo (Crear OT, Generar PDF).
- **Operario**:
    - Lista de tareas asignadas.
    - Iniciar y Finalizar tareas (Reporte de cantidad buena/mala).

## Notas Técnicas

- **Base de Datos**: Por defecto usa SQLite (`backend/prisma/dev.db`) para facilitar la prueba. Para producción, cambiar el proveedor a `postgresql` en `backend/prisma/schema.prisma` y configurar `DATABASE_URL` en `.env`.
- **Estilos**: Tailwind CSS v4 para un diseño moderno y responsivo.
