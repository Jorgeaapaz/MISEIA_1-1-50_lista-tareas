# Retrospectiva de Sesión — 2026-05-19
### Lista de Tareas — Aplicación Full-Stack con Next.js 16 y MongoDB

## Resumen / Overview

Se construyó una aplicación web de lista de tareas (Todo App) completa usando **Next.js 16** (App Router) con **TypeScript**, **Tailwind CSS v4** y **MongoDB** como base de datos. La aplicación permite crear, editar, completar y eliminar tareas, con persistencia real en MongoDB. El proyecto fue scaffoldeado, conectado a MongoDB, desarrollado con CRUD completo, y configurado con un pipeline de CI/CD en GitLab.

## Proceso de instalación / Installation

```bash
# 1. Crear el proyecto Next.js
npx create-next-app@latest lista-tareas --typescript --tailwind --eslint --app --no-src-dir

# 2. Entrar al directorio
cd lista-tareas

# 3. Instalar el driver de MongoDB
npm install mongodb

# 4. Configurar variables de entorno (crear archivo .env.local)
# Contenido:
# MONGODB_URI=mongodb://localhost:27017
# MONGODB_DB=lista-tareas
```

## Comandos ejecutados / Commands Run

```bash
# Instalar dependencias
npm install

# Correr en modo desarrollo
npm run dev

# Compilar para producción
npm run build

# Correr en modo producción
npm start

# Linting
npm run lint
```

## Levantar y detener la aplicación / Running & Stopping

### Pre-requisitos

- Node.js 20+
- MongoDB corriendo localmente en el puerto `27017`

### Levantar MongoDB (Windows)

```bash
# Opción A — Si MongoDB está instalado como servicio de Windows
# Abrir PowerShell como Administrador:
net start MongoDB

# Opción B — Iniciar manualmente con mongod
mongod --dbpath "C:\data\db"
```

### Levantar la aplicación

```bash
# Paso 1 — Ir al directorio del proyecto
cd D:/Master-IA-Dev/01-Bloque01/1-1-50-Lista-Tareas/lista-tareas

# Paso 2 — Instalar dependencias (solo la primera vez o al clonar)
npm install

# Paso 3 — Correr en modo desarrollo
npm run dev
```

La aplicación queda disponible en: **http://localhost:3000**

### Detener la aplicación

```bash
# En la terminal donde corre npm run dev, presionar:
Ctrl + C
```

### Detener MongoDB

```bash
# Si fue iniciado como servicio de Windows (PowerShell como Administrador):
net stop MongoDB

# Si fue iniciado manualmente con mongod:
# En la terminal donde corre mongod, presionar Ctrl + C
```

### Modo producción (opcional)

```bash
# Compilar primero
npm run build

# Luego iniciar el servidor de producción
npm start
# Disponible en: http://localhost:3000
```

## Configuración de red / Network Configuration

Esta aplicación corre localmente en Windows. No se utiliza VirtualBox ni NAT port forwarding. La aplicación y MongoDB corren directamente en la máquina host.

> **Nota:** Si en el futuro se migrara a una VM con VirtualBox usando NAT, se deberían configurar las siguientes reglas de port forwarding:
> - Host `127.0.0.1:3000` → Guest `10.0.2.15:3000` (Next.js)
> - Host `127.0.0.1:27017` → Guest `10.0.2.15:27017` (MongoDB)

## URLs de prueba / Test URLs

| Descripción | URL |
|-------------|-----|
| Aplicación web | http://localhost:3000 |
| API — listar tareas | http://localhost:3000/api/tareas |
| API — crear tarea (POST) | http://localhost:3000/api/tareas |
| API — actualizar tarea (PUT) | http://localhost:3000/api/tareas/:id |
| API — eliminar tarea (DELETE) | http://localhost:3000/api/tareas/:id |

### Ejemplos con curl

```bash
# Listar todas las tareas
curl http://localhost:3000/api/tareas

# Crear una tarea
curl -X POST http://localhost:3000/api/tareas \
  -H "Content-Type: application/json" \
  -d '{"titulo": "Mi primera tarea"}'

# Marcar tarea como completada (reemplazar :id con el _id real)
curl -X PUT http://localhost:3000/api/tareas/:id \
  -H "Content-Type: application/json" \
  -d '{"completada": true}'

# Editar el título de una tarea
curl -X PUT http://localhost:3000/api/tareas/:id \
  -H "Content-Type: application/json" \
  -d '{"titulo": "Título actualizado"}'

# Eliminar una tarea
curl -X DELETE http://localhost:3000/api/tareas/:id
```

## Arquitectura del proyecto / Project Structure

```
lista-tareas/
├── app/
│   ├── api/
│   │   └── tareas/
│   │       ├── route.ts          # GET (listar) y POST (crear)
│   │       └── [id]/
│   │           └── route.ts      # PUT (editar/completar) y DELETE (eliminar)
│   ├── components/
│   │   └── ListaTareas.tsx       # Componente client-side principal
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
│   └── mongodb.ts                # Singleton de conexión a MongoDB
├── .env.local                    # Variables de entorno (no commitear)
├── .gitlab-ci.yml                # Pipeline CI/CD GitLab (build)
├── next.config.ts
├── tsconfig.json
└── package.json
```

## Stack tecnológico / Tech Stack

| Tecnología | Versión | Rol |
|------------|---------|-----|
| Next.js | 16.2.2 | Framework full-stack (App Router) |
| React | 19.2.4 | UI |
| TypeScript | ^5 | Tipado estático |
| Tailwind CSS | ^4 | Estilos |
| MongoDB | ^7.1.1 (driver) | Base de datos |
| Node.js | 20+ | Runtime |

## Problemas encontrados / Problems & Solutions

| Problema | Solución |
|----------|----------|
| Next.js 16 tiene breaking changes respecto a versiones anteriores | Se agregó `AGENTS.md` indicando leer la documentación en `node_modules/next/dist/docs/` antes de escribir código |
| La conexión de MongoDB se recrea en cada hot-reload en desarrollo | Se implementó singleton con `global._mongoClient` para reutilizar la conexión en `NODE_ENV=development` |

## Resultados y conclusiones / Results & Conclusions

- La aplicación CRUD de tareas quedó completamente funcional con persistencia en MongoDB.
- El pipeline de CI/CD en GitLab (`npm ci` + `npm run build`) valida builds automáticamente en cada push.
- La conexión a MongoDB usa un patrón singleton que evita múltiples conexiones en desarrollo con hot-reload.
- Next.js 16 con App Router es la versión activa; respetar breaking changes respecto a versiones anteriores (Next.js 13-15).
- **Próximo paso sugerido:** agregar autenticación, filtros por estado, o despliegue en producción (Vercel + MongoDB Atlas).
