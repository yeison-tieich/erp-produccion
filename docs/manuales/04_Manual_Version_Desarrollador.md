# Manual de versión de desarrollador - Control MT

## 1. Objetivo

Este manual define cómo trabajar en la versión de desarrollo del proyecto, mantener coherencia entre ramas, pruebas locales y preparación del código para pasar a producción.

## 2. Requisitos locales

- Node.js LTS
- npm
- PostgreSQL accesible para desarrollo
- editor de código con terminal
- acceso al repositorio
- variables de entorno locales para backend y frontend

## 3. Estructura recomendada de trabajo

- `main` = versión de producción
- `develop` = integración y pruebas
- `feature/*` = nuevas funcionalidades
- `fix/*` = correcciones
- `hotfix/*` = correcciones críticas

## 4. Configuración local

### Backend

```bash
cd backend
npm install
npx prisma generate
cp .env.example .env
# completar DATABASE_URL, JWT_SECRET, FRONTEND_URL, Cloudinary
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 5. Comandos básicos

### Instalar dependencias

```bash
npm install
```

### Ejecutar app local

```bash
npm run dev
```

### Compilar backend

```bash
cd backend
npm run build
```

### Compilar frontend

```bash
cd frontend
npm run build
```

### Prisma

```bash
cd backend
npx prisma generate
npx prisma migrate status
npx prisma migrate deploy
```

## 6. Flujo de trabajo diario

1. revisar tarea o cambio solicitado,
2. crear rama o actualizar la existente,
3. desarrollar la solución,
4. ejecutar validación local,
5. dejar documentación del cambio,
6. subir cambios para revisión,
7. solicitar prueba en entorno de pruebas,
8. pasar a producción cuando la validación esté aprobada.

## 7. Buenas prácticas para desarrollador

- mantener commits pequeños y claros,
- no dejar archivos temporales ni logs sin limpiar,
- no subir `.env` ni credenciales,
- documentar cambios funcionales y de infraestructura,
- validar rutas principales antes de fusionar,
- verificar compatibilidad con PostgreSQL y Prisma.

## 8. Validación previa a revisión

Antes de pedir aprobación, comprobar:

- login funciona,
- módulo afectado responde correctamente,
- no se rompe otra parte del flujo,
- backend y frontend compilan,
- no hay errores de consola o logs relevantes.

## 9. Entrega de desarrollo

Cuando una tarea está cerrada, debe incluir:

- cambios en código,
- evidencia de pruebas,
- comentarios de lo que se corrigió o añadió,
- referencia a la versión en pruebas o producción,
- estado final de la tarea.

## 10. Cierre

La versión de desarrollador debe ser controlada, reproducible y clara para cualquiera que vaya a continuar el trabajo. Mantener orden en ramas, código y operaciones es clave para evitar errores de despliegue.
