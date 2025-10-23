# 📊 Didaskaloi: Sistema de Gestión de Asistencia Estudiantil

Una aplicación móvil optimizada en Next.js para gestionar clases, estudiantes y asistencia con reportes estadísticos detallados.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.0-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.6-2D3748?logo=prisma)

## 🚀 Características

### Autenticación y Colaboración
- ✅ Sistema de autenticación completo con NextAuth v5
- ✅ Registro e inicio de sesión con email/password
- ✅ Gestión de proyectos colaborativos
- ✅ Sistema de roles (Admin, Editor, Viewer)
- ✅ Códigos de invitación para compartir proyectos
- ✅ Sesiones seguras con JWT

### Gestión Académica
- ✅ Gestión completa de clases y estudiantes
- ✅ Registro de asistencia intuitivo con interfaz tipo swipe
- ✅ Reportes estadísticos detallados con gráficos interactivos
- ✅ Filtros avanzados por clase, género y búsqueda
- ✅ Exportación de reportes a PDF y Excel
- ✅ Importación masiva de estudiantes desde CSV
- ✅ Validación de datos duplicados
- ✅ Notificaciones de asistencia baja

### Experiencia de Usuario
- ✅ Modo oscuro/claro
- ✅ PWA - Funciona sin conexión
- ✅ Interfaz optimizada para dispositivos móviles
- ✅ Sincronización offline con IndexedDB

## 📱 Vistas Principales

1. **Clases**: Lista completa de clases con acceso a estudiantes y estadísticas
2. **Estudiantes**: Gestión centralizada de estudiantes con filtros avanzados
3. **Asistencia**: Registro rápido de asistencia por clase con navegación intuitiva
4. **Reportes**: Análisis estadísticos de asistencia, demografía y rendimiento
5. **Configuración**: Personalización de rangos de edad y ajustes de la aplicación

## 💻 Stack Tecnológico

### Frontend
- **Next.js 15.5** - Framework React con App Router
- **React 19** - Biblioteca de UI
- **TypeScript 5** - Tipado estático
- **Tailwind CSS 4** - Estilos utility-first
- **shadcn/ui** - Componentes de UI accesibles
- **Lucide React** - Iconos modernos
- **Recharts** - Gráficos interactivos

### Backend & Base de Datos
- **Prisma 6.6** - ORM para PostgreSQL
- **PostgreSQL** - Base de datos relacional (Neon)
- **NextAuth v5** - Autenticación completa
- **bcryptjs** - Hash de contraseñas
- **Server Actions** - API serverless de Next.js

### Validación & Formularios
- **Zod** - Validación de esquemas
- **React Hook Form** - Manejo de formularios
- **date-fns** - Manipulación de fechas

### Exportación & PWA
- **jsPDF** - Generación de PDFs
- **xlsx** - Exportación a Excel
- **next-pwa** - Progressive Web App

## 🛠️ Instalación y Configuración

### Prerrequisitos

- Node.js 18+ y npm/pnpm/yarn
- PostgreSQL (o cuenta en Neon/Supabase)
- Git

### Pasos de Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/joeldblanco/didaskaloi.git
cd didaskaloi

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de base de datos

# 4. Ejecutar migraciones de Prisma
npx prisma migrate dev --name init

# 5. (Opcional) Poblar base de datos con datos de ejemplo
npx prisma db seed

# 6. Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Base de datos PostgreSQL
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# NextAuth Configuration
# Genera un secret con: openssl rand -base64 32
NEXTAUTH_SECRET="tu_secret_aleatorio_aqui"
NEXTAUTH_URL="http://localhost:3000"
```

## 📝 Scripts Disponibles

```bash
npm run dev          # Inicia servidor de desarrollo
npm run build        # Construye para producción
npm run start        # Inicia servidor de producción
npm run lint         # Ejecuta ESLint
npx prisma studio    # Abre Prisma Studio (GUI de base de datos)
npx prisma migrate   # Gestiona migraciones de base de datos
```

## 🗄️ Estructura del Proyecto

```
didaskaloi/
├── prisma/
│   └── schema.prisma          # Esquema de base de datos
├── public/                    # Archivos estáticos
├── src/
│   ├── app/                   # App Router de Next.js
│   │   ├── api/
│   │   │   └── auth/         # API routes de NextAuth
│   │   ├── auth/
│   │   │   ├── login/        # Página de inicio de sesión
│   │   │   └── register/     # Página de registro
│   │   ├── asistencia/       # Página de registro de asistencia
│   │   ├── clases/           # Gestión de clases
│   │   ├── configuracion/    # Configuración de la app
│   │   ├── estudiantes/      # Gestión de estudiantes
│   │   ├── proyectos/        # Gestión de proyectos
│   │   ├── reportes/         # Reportes y estadísticas
│   │   ├── layout.tsx        # Layout principal
│   │   └── page.tsx          # Página de inicio
│   ├── components/
│   │   ├── ui/               # Componentes de shadcn/ui
│   │   ├── bottom-navigation.tsx
│   │   └── offline-sync-provider.tsx
│   ├── contexts/
│   │   └── project-context.tsx
│   └── lib/
│       ├── actions.ts        # Server Actions
│       ├── auth.ts           # Configuración de NextAuth
│       ├── auth-actions.ts   # Acciones de autenticación
│       ├── auth-utils.ts     # Utilidades de auth
│       ├── prisma.ts         # Cliente de Prisma
│       ├── utils.ts          # Utilidades
│       └── validations.ts    # Esquemas de Zod
├── middleware.ts             # Middleware de NextAuth
├── .env.example              # Plantilla de variables de entorno
├── package.json
└── README.md
```

## 📊 Modelo de Datos

```prisma
User (Usuario)
  ├── id: Int
  ├── email: String (unique)
  ├── password: String (bcrypt hash)
  ├── name: String
  ├── ownedProjects: Project[]
  └── projectMemberships: ProjectMember[]

Project (Proyecto)
  ├── id: Int
  ├── name: String
  ├── accessCode: String (unique)
  ├── password: String (bcrypt hash)
  ├── ownerId: Int
  ├── members: ProjectMember[]
  ├── inviteCodes: InviteCode[]
  ├── classes: Class[]
  └── ageRanges: AgeRange[]

ProjectMember (Miembro de Proyecto)
  ├── id: Int
  ├── userId: Int
  ├── projectId: Int
  └── role: Role (ADMIN/EDITOR/VIEWER)

InviteCode (Código de Invitación)
  ├── id: Int
  ├── code: String (unique)
  ├── projectId: Int
  ├── role: Role
  ├── expiresAt: DateTime?
  ├── maxUses: Int?
  └── usedCount: Int

Class (Clase)
  ├── id: Int
  ├── name: String
  ├── projectId: Int
  ├── students: Student[]
  └── attendances: Attendance[]

Student (Estudiante)
  ├── id: Int
  ├── firstName: String
  ├── lastName: String
  ├── gender: Gender (M/F)
  ├── age: Int
  ├── classId: Int
  └── attendanceRecords: AttendanceRecord[]

Attendance (Asistencia)
  ├── id: Int
  ├── date: DateTime
  ├── classId: Int
  └── records: AttendanceRecord[]

AttendanceRecord (Registro de Asistencia)
  ├── id: Int
  ├── present: Boolean
  ├── studentId: Int
  └── attendanceId: Int

AgeRange (Rango de Edad)
  ├── id: Int
  ├── label: String
  ├── minAge: Int
  ├── maxAge: Int
  └── projectId: Int
```

## 🎯 Uso de la Aplicación

### 1. Registro e Inicio de Sesión
- **Primera vez**: Regístrate en `/auth/register` con email, nombre y contraseña
- **Usuarios existentes**: Inicia sesión en `/auth/login`
- Las sesiones son seguras con JWT y duran 30 días
- El middleware protege automáticamente todas las rutas

### 2. Gestión de Proyectos
- Crea proyectos nuevos o únete a proyectos existentes
- Cada proyecto tiene un código único y contraseña
- Invita colaboradores con códigos de invitación
- Define roles: Admin (control total), Editor (editar), Viewer (solo ver)

### 3. Gestión de Clases
- Crea clases desde el botón flotante (+)
- Edita o elimina clases existentes
- Haz clic en una clase para ver sus estudiantes

### 4. Gestión de Estudiantes
- Agrega estudiantes individualmente o importa desde CSV
- Filtra por clase, género o búsqueda de texto
- Visualiza el porcentaje de asistencia de cada estudiante

### 5. Registro de Asistencia
- Selecciona una clase
- Crea un nuevo registro para la fecha actual
- Marca presente (✓) o ausente (✗) para cada estudiante
- Navega entre estudiantes con las flechas

### 6. Reportes
- Visualiza reportes generales o por clase específica
- Gráficos de distribución por género y edad
- Mejores asistencias por categoría
- Exporta reportes a PDF o Excel

### 7. Configuración
- Define rangos de edad personalizados
- Los rangos se usan para agrupar estudiantes en reportes

## 🔒 Seguridad

- ✅ **NextAuth v5** implementado con autenticación completa
- ✅ Contraseñas hasheadas con **bcryptjs** (12 rounds)
- ✅ Sesiones seguras con **JWT**
- ✅ Middleware protege todas las rutas automáticamente
- ✅ Sistema de roles para control de acceso
- ✅ Validación de datos con **Zod**
- ⚠️ Las credenciales de base de datos están en `.env` (no commitear)
- ⚠️ Usa HTTPS en producción
- ⚠️ Genera un `NEXTAUTH_SECRET` único y seguro

## 🚀 Despliegue

### Vercel (Recomendado)

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Desplegar
vercel

# 3. Configurar variables de entorno en Vercel Dashboard
# DATABASE_URL, NEXTAUTH_SECRET y NEXTAUTH_URL
```

### Docker

```bash
# Construir imagen
docker build -t didaskaloi .

# Ejecutar contenedor
docker run -p 3000:3000 --env-file .env didaskaloi
```

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Roadmap

- [x] Sistema de autenticación robusto con roles
- [x] Sistema de proyectos colaborativos
- [x] Modo offline con sincronización
- [ ] Sincronización multi-dispositivo en tiempo real
- [ ] Notificaciones push
- [ ] Integración con Google Classroom
- [ ] App móvil nativa (React Native)
- [ ] Dashboard para administradores
- [ ] Análisis predictivo de asistencia
- [ ] OAuth con Google/Microsoft

## 🐛 Reporte de Bugs

Si encuentras un bug, por favor abre un issue en GitHub con:
- Descripción del problema
- Pasos para reproducirlo
- Comportamiento esperado vs actual
- Screenshots si es posible

## 👨‍💻 Autor

**Joel Blanco**
- GitHub: [@joeldblanco](https://github.com/joeldblanco)

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- [shadcn/ui](https://ui.shadcn.com/) por los componentes de UI
- [Lucide](https://lucide.dev/) por los iconos
- [Recharts](https://recharts.org/) por los gráficos
- [Prisma](https://www.prisma.io/) por el ORM

---

⭐ Si este proyecto te fue útil, considera darle una estrella en GitHub!
