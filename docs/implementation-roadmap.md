# Technized Web - Roadmap de Implementacion

## Estado actual

- La `home` publica ya existe y, por ahora, se considera estable.
- El proyecto esta en Astro con Tailwind y hoy funciona como sitio publico sin backend propio.
- La prioridad inmediata es construir el area `Clientes` con autenticacion y autorizacion real.

## Objetivo general

Construir el sitio en dos capas:

- `Sitio publico`: marketing, identidad institucional, servicios, partners, contacto, careers.
- `Portales privados`: acceso autenticado para `Clientes` y luego `Colaboradores`.

## Prioridades

### Prioridad 1

Portal de `Clientes`:

- login
- proteccion de rutas
- dashboard privado
- listado de aplicaciones disponibles
- permisos para ver solo las aplicaciones autorizadas

### Prioridad 2

Base de contenido publico faltante:

- Quienes somos
- Servicios y Soluciones con detalle
- Partners
- Trabaja con Nosotros
- Contacto definitivo

### Prioridad 3

Portal de `Colaboradores`:

- acceso autenticado
- herramientas internas
- documentacion
- accesos a plataformas

### Prioridad 4

Multidioma:

- Espanol
- Ingles
- Portugues

## Fases recomendadas

### Fase 0 - Base tecnica para auth

- Pasar Astro a `SSR` con adapter de Node.
- Configurar variables de entorno de Supabase.
- Crear cliente server-side y client-side de Supabase.
- Agregar middleware para leer sesion y proteger rutas privadas.

Resultado esperado:

- el sitio publico sigue funcionando
- el proyecto ya soporta sesiones reales

### Fase 1 - Portal de Clientes MVP

Rutas iniciales:

- `/login`
- `/clientes`
- `/clientes/dashboard`
- `/clientes/aplicaciones`

Capacidades:

- login por email y password
- logout
- redireccion a login si no hay sesion
- dashboard inicial
- mosaico de aplicaciones autorizadas para el usuario

Resultado esperado:

- cada cliente ve solo lo que le corresponde

### Fase 2 - Modelo de permisos

Implementar autorizacion en base de datos:

- un usuario puede pertenecer a un cliente
- un cliente puede tener varias aplicaciones habilitadas
- opcionalmente, un usuario puede tener permisos particulares

Resultado esperado:

- no solo hay login
- tambien hay control fino de acceso

### Fase 3 - Administracion basica

- carga de aplicaciones
- asignacion de apps a clientes
- asociacion de usuarios a clientes
- activacion y desactivacion de accesos

Resultado esperado:

- el portal deja de depender de cambios manuales en codigo

### Fase 4 - Colaboradores

Rutas sugeridas:

- `/colaboradores`
- `/colaboradores/dashboard`
- `/colaboradores/herramientas`
- `/colaboradores/documentacion`

Resultado esperado:

- mismo esquema de auth, distinto rol y permisos

### Fase 5 - Multidioma

Implementacion recomendada:

- rutas por idioma: `/es`, `/en`, `/pt`
- textos publicos por diccionario
- area privada en una sola lengua en la primera iteracion, si hace falta salir mas rapido

## Arquitectura recomendada para Clientes

### Rutas

- `/login`
- `/clientes/dashboard`
- `/clientes/aplicaciones`
- `/clientes/aplicaciones/[slug]`
- `/clientes/novedades`
- `/clientes/herramientas`

### Roles

- `admin`
- `client_user`
- `collaborator`

### Regla base

Ninguna ruta privada debe depender solo del frontend para decidir acceso. La proteccion debe existir en:

- middleware de Astro
- consultas server-side
- Row Level Security en Supabase

## Modelo inicial de base de datos

### Tabla `profiles`

- `id uuid primary key` igual a `auth.users.id`
- `email text`
- `full_name text`
- `role text`
- `is_active boolean`
- `created_at timestamptz`

### Tabla `clients`

- `id uuid primary key`
- `name text`
- `slug text`
- `is_active boolean`
- `created_at timestamptz`

### Tabla `applications`

- `id uuid primary key`
- `name text`
- `slug text`
- `url text`
- `description text`
- `icon text`
- `sort_order int`
- `is_active boolean`

### Tabla `client_memberships`

- `id uuid primary key`
- `client_id uuid`
- `user_id uuid`
- `role text`
- `is_active boolean`

### Tabla `client_application_access`

- `id uuid primary key`
- `client_id uuid`
- `application_id uuid`
- `is_enabled boolean`

### Tabla opcional `user_application_access`

Usar solo si un mismo cliente necesita permisos distintos por usuario.

- `id uuid primary key`
- `user_id uuid`
- `application_id uuid`
- `is_enabled boolean`

## Seguridad recomendada

- Auth con Supabase
- rutas protegidas con Astro middleware
- consultas privadas hechas server-side
- RLS activa en tablas privadas
- MFA como fase posterior si hace falta

## Orden concreto de desarrollo

### Sprint 1

- SSR en Astro
- setup de Supabase
- login
- logout
- middleware
- pagina `/clientes/dashboard`

### Sprint 2

- esquema SQL
- RLS
- listado de aplicaciones por usuario/cliente
- pagina `/clientes/aplicaciones`

### Sprint 3

- detalle de aplicacion
- novedades
- herramientas
- refinamiento visual del portal

### Sprint 4

- panel operativo simple o seeds de administracion
- alta de clientes
- alta de usuarios
- asignacion de permisos

## Decisiones que ya conviene tomar

- El `login` inicial sera con `email/password`.
- La prioridad funcional es `Clientes`, no `Colaboradores`.
- El sitio publico no se rehace ahora salvo ajustes puntuales.
- Los permisos se modelan desde base de datos, no desde hardcode.
- Las areas privadas van en rutas separadas del sitio publico.

## Proximo paso recomendado

Implementar el `MVP de Clientes`:

- adaptar Astro a SSR
- conectar Supabase
- crear `/login`
- crear middleware
- crear `/clientes/dashboard`
- crear la base SQL inicial para usuarios, clientes y aplicaciones
