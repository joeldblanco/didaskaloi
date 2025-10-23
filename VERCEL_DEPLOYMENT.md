# Guía de Despliegue en Vercel

## Variables de Entorno Requeridas

Para que la aplicación funcione correctamente en Vercel, debes configurar las siguientes variables de entorno en el Dashboard de Vercel (Settings > Environment Variables):

### 1. DATABASE_URL (REQUERIDO)
La cadena de conexión a tu base de datos PostgreSQL.

```
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

**Opciones recomendadas de base de datos:**
- [Neon](https://neon.tech) - PostgreSQL serverless (gratis para empezar)
- [Supabase](https://supabase.com) - PostgreSQL con funciones adicionales
- [Railway](https://railway.app) - PostgreSQL y otros servicios

### 2. NEXTAUTH_SECRET (REQUERIDO)
Una cadena aleatoria secreta para NextAuth. Debe ser única y segura.

**Generar un secret:**
```bash
openssl rand -base64 32
```

Ejemplo:
```
NEXTAUTH_SECRET="tu_secret_aleatorio_de_32_caracteres_aqui"
```

### 3. NEXTAUTH_URL (REQUERIDO EN PRODUCCIÓN)
La URL completa de tu aplicación en producción.

```
NEXTAUTH_URL="https://tu-app.vercel.app"
```

**Nota:** Reemplaza `tu-app.vercel.app` con tu dominio real de Vercel.

## Pasos para Configurar en Vercel

### Opción 1: Desde el Dashboard de Vercel

1. Ve a tu proyecto en Vercel
2. Navega a **Settings** > **Environment Variables**
3. Agrega las tres variables mencionadas arriba
4. Asegúrate de seleccionar **Production**, **Preview**, y **Development** para cada variable
5. Haz clic en **Save**
6. Redespliega tu aplicación desde la pestaña **Deployments**

### Opción 2: Usando Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Iniciar sesión
vercel login

# Configurar variables de entorno
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL

# Desplegar
vercel --prod
```

## Solución de Problemas Comunes

### Error: MIDDLEWARE_INVOCATION_FAILED

Este error generalmente ocurre cuando:

1. **NEXTAUTH_SECRET no está configurado** ✅ CORREGIDO
   - Asegúrate de agregar `NEXTAUTH_SECRET` en las variables de entorno de Vercel

2. **trustHost no está habilitado** ✅ CORREGIDO
   - Ya agregamos `trustHost: true` en la configuración de NextAuth

3. **DATABASE_URL no está configurado o es inválido**
   - Verifica que la cadena de conexión sea correcta
   - Asegúrate de que tu base de datos esté accesible desde Internet

### Error: Cannot connect to database

Si ves errores de conexión a la base de datos:

1. Verifica que `DATABASE_URL` esté correctamente configurado
2. Asegúrate de que tu base de datos permita conexiones desde IPs de Vercel
3. Para Neon: usa el connection string con pooling para mejor rendimiento
4. Agrega `?sslmode=require` al final de la URL si tu proveedor lo requiere

### Página en blanco o redirect loop

Si la aplicación muestra una página en blanco o entra en un bucle de redirección:

1. Verifica que `NEXTAUTH_URL` apunte a tu dominio de producción correcto
2. Asegúrate de que no haya cookies conflictivas (limpia las cookies del navegador)
3. Revisa los logs en Vercel Dashboard > Functions

## Base de Datos: Configuración Inicial

Después de desplegar, necesitas ejecutar las migraciones de Prisma:

### Opción 1: Usando Vercel CLI localmente

```bash
# Conectar a la base de datos de producción
DATABASE_URL="tu_production_database_url" npx prisma migrate deploy

# O ejecutar el seed si quieres datos de ejemplo
DATABASE_URL="tu_production_database_url" npx prisma db seed
```

### Opción 2: Usando Vercel Postgres (si usas Vercel Postgres)

Las migraciones se ejecutarán automáticamente en el primer deploy.

## Verificar el Despliegue

1. Abre tu URL de Vercel: `https://tu-app.vercel.app`
2. Deberías ver la página de login
3. Si ves un error 500, revisa:
   - Logs en Vercel Dashboard > Functions
   - Variables de entorno correctamente configuradas
   - Conexión a la base de datos

## Configuración Avanzada

### Custom Domain

1. Ve a Settings > Domains en Vercel
2. Agrega tu dominio personalizado
3. Actualiza `NEXTAUTH_URL` con tu nuevo dominio
4. Redespliega la aplicación

### Monitoring y Logs

- Logs en tiempo real: Vercel Dashboard > Functions
- Analytics: Vercel Dashboard > Analytics
- Speed Insights: Vercel Dashboard > Speed Insights

## Actualizaciones y Redespliegue

Vercel redesplegará automáticamente cuando hagas push a tu rama principal en GitHub. Para forzar un redespliegue:

1. Ve a Deployments
2. Encuentra el deployment más reciente
3. Haz clic en el menú de tres puntos
4. Selecciona "Redeploy"

## Contacto y Soporte

Si tienes problemas con el despliegue:

1. Revisa los logs en Vercel Dashboard
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que la base de datos esté accesible
4. Abre un issue en el repositorio de GitHub

---

**Nota:** La aplicación ya incluye las correcciones necesarias para funcionar en Vercel con NextAuth v5.
