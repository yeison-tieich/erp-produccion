# 06. Guía de Operación y Despliegue - Control MT

Esta guía describe los pasos necesarios para configurar, ejecutar y desplegar el sistema Control MT.

## Requisitos Previos
- **Node.js**: Versión 18 o superior.
- **npm**: Gestor de paquetes de Node.
- **Prisma CLI**: Para la gestión de la base de datos.

## Configuración del Entorno (.env)

El backend requiere un archivo `.env` en la carpeta `/backend` con las siguientes variables:
- `PORT`: Puerto donde correrá el servidor (default: 3000).
- `DATABASE_URL`: Ruta al archivo SQLite (ej: `file:./prisma/dev.db`).
- `JWT_SECRET`: Llave secreta para la firma de tokens.
- `CLOUDINARY_URL`: Para el almacenamiento de imágenes en la nube.

## Instalación y Ejecución

### 1. Preparar el Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push # Para sincronizar el esquema
npm run seed:all   # Opcional: Para cargar datos iniciales
npm run dev        # Ejecutar en modo desarrollo
```

### 2. Preparar el Frontend
```bash
cd frontend
npm install
npm run dev        # Ejecutar en modo desarrollo (Vite)
```

## Despliegue (Producción)

### Backend
1. Ejecutar `npm run build` para compilar TypeScript a JavaScript.
2. Las variables de entorno deben configurarse en el panel de control del hosting (ej: Railway, Render).
3. Asegurarse de realizar `npx prisma migrate deploy` antes de iniciar en producción.

### Frontend
1. Ejecutar `npm run build` en la carpeta `/frontend`.
2. Vite generará una carpeta `dist/` con archivos estáticos.
3. Desplegar el contenido de `dist/` en un servicio de hosting estático (ej: Vercel, Netlify).

## Desarrollo Móvil (Capacitor)

Para compilar y probar la aplicación en dispositivos móviles:

1. **Sincronizar activos**:
   ```bash
   cd frontend
   npm run build
   npx cap sync
   ```
2. **Abrir IDE Nativo**:
   ```bash
   npx cap open android  # Para Android Studio
   npx cap open ios      # Para Xcode
   ```
3. **Persistencia Local**: La base de datos SQLite local se inicializa automáticamente al detectar una plataforma nativa. No requiere configuración manual previa.

## Mantenimiento de Datos
- **Backups**: Al usar SQLite, una copia del archivo `.db` en `/backend/prisma/dev.db` sirve como respaldo completo de la base de datos.
- **Seeds**: Los archivos en `/backend/prisma/seed*` permiten restaurar la configuración básica de máquinas, personal y operaciones.
- **Limpieza (Housekeeping)**: 
    - Periódicamente, se deben eliminar archivos temporales y logs de la raíz del proyecto.
    - Los archivos subidos por los usuarios se encuentran en `/backend/uploads`. Se recomienda revisar estas carpetas si el almacenamiento crece demasiado.
    - Se han eliminado scripts de mantenimiento obsoletos (`check-*`, `fix-*`) para mantener el repositorio limpio. Cualquier script nuevo de mantenimiento debe crearse en una carpeta dedicada o como una tarea de npm.
