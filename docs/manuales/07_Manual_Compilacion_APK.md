# Manual de compilación del APK - Control MT

## 1. Objetivo

Este manual describe la compilación de la versión Android de la app tras cada modificación, usando Capacitor y Android Studio.

## 2. Requisitos

- Node.js y npm
- Android Studio instalado
- Android SDK configurado
- Java JDK compatible
- proyecto frontend con Capacitor configurado
- conexión con la API correcta en producción o pruebas

## 3. Preparación antes de compilar

### 3.1 Validar código

Antes de compilar:

1. revisar que la funcionalidad está terminada,
2. ejecutar pruebas funcionales asociadas,
3. compilar la app web del frontend,
4. verificar que la API destino es la correcta.

### 3.2 Configurar API para la app

En el ambiente móvil, confirmar la URL base de la API, por ejemplo:

```env
VITE_API_URL=https://tu-dominio.com
```

o según el entorno de pruebas/producción a utilizar.

## 4. Compilación de la app web

Desde la carpeta frontend:

```bash
cd frontend
npm install
npm run build
```

Luego sincronizar con Capacitor:

```bash
npx cap sync android
```

Si la plataforma Android aún no existe:

```bash
npx cap add android
```

## 5. Abrir Android Studio

```bash
npx cap open android
```

En Android Studio:

- revisar que el proyecto cargó correctamente,
- verificar versión de SDK,
- revisar que la configuración de firma es correcta,
- compilar el proyecto.

## 6. Generar APK

En Android Studio:

1. abrir `Build` > `Generate Signed Bundle / APK` o `Build` > `Build APK`.
2. elegir la opción de APK si no se requiere bundle.
3. seleccionar la keystore o crear una nueva firma si es la primera vez.
4. completar alias, contraseña y demás datos requeridos.
5. ejecutar la generación.

## 7. Proceso recomendado tras cada modificación

Se recomienda repetir este flujo a cada cambio visible del app móvil:

```bash
cd frontend
npm install
npm run build
npx cap sync android
npx cap open android
```

Luego:

- compilar en Android Studio,
- firmar la APK,
- instalar en un equipo o dispositivo de pruebas,
- validar flujo que se modificó.

## 8. Verificación post-compilación

Validar lo siguiente:

- login y permisos,
- carga de información del servidor,
- pantallas afectadas,
- carga de archivos,
- flujo de navegación,
- comportamiento offline/online si aplica,
- errores de permisos y cámara.

## 9. Buenas prácticas

- no compilar con la URL equivocada,
- no firmar con keystore incorrecto,
- no entregar APK sin probar en dispositivo,
- guardar la versión generada con nombre claro,
- mantener registro de la APK y de la fecha de compilación.

## 10. Cierre

La compilación del APK no debe ser un paso final improvisado. Tras cada modificación debe comprobarse que el código compiló correctamente, la app quedó con la configuración adecuada y la versión generada responde al cambio solicitado.
