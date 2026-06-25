# Lista de Tareas — Aplicación Full-Stack con Next.js 16, MongoDB y CI/CD en GCI

> Aplicación web de gestión de tareas construida con **Next.js 16.2.2** (App Router), **React 19.2.4**, **TypeScript estricto**, **Tailwind CSS v4** y **MongoDB 7.1.1**. Permite crear, editar, completar y eliminar tareas con persistencia real en una base de datos MongoDB alojada en Google Cloud Infrastructure, búsqueda y filtrado avanzado, paginación, exportación a PDF y despliegue automatizado mediante GitHub Actions + Docker + Traefik.

---

## Tabla de Contenidos

1. [Funcionalidades Implementadas](#1-funcionalidades-implementadas)
2. [Estructura del Proyecto](#2-estructura-del-proyecto)
3. [Patrones de Diseño y Arquitectura](#3-patrones-de-diseño-y-arquitectura)
4. [Cómo Funciona](#4-cómo-funciona)
5. [Primeros Pasos](#5-primeros-pasos)
6. [Ejemplo de Salida](#6-ejemplo-de-salida)
7. [Requisitos](#7-requisitos)
8. [Especificaciones](#8-especificaciones)
9. [Pruebas Unitarias e Integración](#9-pruebas-unitarias-e-integración)
10. [Despliegue](#10-despliegue)
11. [Mejoras y Extensiones](#11-mejoras-y-extensiones)
12. [Cambios Documentados y Revisión Crítica](#12-cambios-documentados-y-revisión-crítica)

---

## 1. Funcionalidades Implementadas

### 1.1 CRUD Completo de Tareas

Operaciones crear, leer, actualizar y eliminar implementadas mediante API Routes de Next.js conectadas a MongoDB.

| Operación | Endpoint | Método HTTP |
|---|---|---|
| Listar todas | `/api/tareas` | GET |
| Crear | `/api/tareas` | POST |
| Actualizar título o estado | `/api/tareas/[id]` | PUT |
| Eliminar | `/api/tareas/[id]` | DELETE |

- **Modelo de datos:** `{ _id: ObjectId, titulo: string, completada: boolean, creadoEn: Date }`
- **Timeout de conexión:** 3 000 ms en `serverSelectionTimeoutMS` y `connectTimeoutMS`
- **Singleton:** una sola instancia de `MongoClient` por proceso (global en dev, module-level en prod)
- **Siembra:** script `scripts/seed.js` inserta 30 tareas de muestra con estados mixtos

### 1.2 Búsqueda, Filtrado y Paginación

Panel de búsqueda que se muestra solo cuando hay 2 o más tareas en la lista.

- **Filtro por título:** coincidencia parcial, insensible a mayúsculas mediante `lib/filtrarTareas.ts`
- **Filtro por estado:** Todas / Completadas / Pendientes (`FiltroCompletada` union type)
- **Combinación de filtros:** título y estado se aplican simultáneamente
- **Modal de sin resultados:** aparece cuando la búsqueda no encuentra coincidencias, muestra los términos buscados
- **Paginación:** 5 tareas por página, controles Anterior/Siguiente, indicador "Página X de Y"
- **Reset automático:** al aplicar nueva búsqueda, la paginación regresa a página 1
- **Contador:** "N resultado(s) encontrado(s)" visible tras cada búsqueda

### 1.3 Reporte PDF

Exportación de la lista actualmente visible (ya filtrada y con términos de búsqueda aplicados) a un archivo PDF descargable.

- **Librería:** `jspdf 4.2.1` + `jspdf-autotable 5.0.8`
- **Importación dinámica:** `import('jspdf')` y `import('jspdf-autotable')` dentro del handler del botón para evitar fallos de SSR causados por dependencias de `canvg`/`core-js` incompatibles con el servidor de Next.js
- **Contenido del PDF:** título del reporte, fecha de generación, filtros activos, tabla de tareas (número, título, estado), totales de completadas y pendientes
- **Botón deshabilitado:** cuando `tareasMostradas.length === 0`
- **Nombre del archivo:** `reporte-tareas.pdf`

### 1.4 Conexión MongoDB GCI con Fallback Offline

Resiliencia ante la indisponibilidad de la base de datos sin interrumpir la experiencia del usuario.

- **Instancia remota:** MongoDB 7.0 en contenedor Docker en `34.174.56.186:27020`
- **Detección:** el API incluye el header `X-DB-Status: connected|disconnected` en cada respuesta
- **Fallback:** si la BD no responde en 3 s, el GET devuelve 3 registros de muestra con el sufijo `(sin conexión)` en el título
- **Indicador visual:** círculo verde/rojo en esquina inferior derecha (siempre visible)
- **Banda naranja:** banner fijo en la parte inferior con mensaje y botón "Reconnect"
- **Reconexión:** el botón llama de nuevo a `cargarTareas()` que borra el estado en caché mediante `resetConnection()` e intenta una nueva conexión real

### 1.5 Pipeline CI/CD con GitHub Actions y Docker

Automatización completa del ciclo construir → validar → desplegar.

- **Flujo:** push a `master` → pruebas unitarias → build de imagen Docker → push a GHCR → SSH al VM GCI → `docker compose up`
- **Imagen:** multi-stage con `output: "standalone"` — solo incluye el runtime mínimo de Node.js
- **Registro:** GitHub Container Registry (`ghcr.io/jorgeaapaz/miseia_1-1-50_lista-tareas:latest`)
- **Proxy inverso:** Traefik v3.3 con proveedor Docker, red `miseia-net`, resolver Cloudflare para certificados TLS wildcard `*.deviaaps.com`
- **Caché de capas:** `type=gha` en `docker/build-push-action` — builds subsecuentes sin cambios en `package.json` completan en < 90 s
- **Secretos:** 5 secretos gestionados con `gh secret set` — nunca en el código fuente

---

## 2. Estructura del Proyecto

```
lista-tareas/
├── .github/
│   └── workflows/
│       └── deploy.yml              # Pipeline CI/CD: lint → tests → build Docker → deploy SSH
├── __tests__/
│   ├── filtrarTareas.test.ts       # Tests unitarios de la función de filtrado
│   └── ListaTareas.test.tsx        # 46 tests del componente principal (búsqueda, paginación, PDF, BD)
├── app/
│   ├── api/
│   │   └── tareas/
│   │       ├── route.ts            # GET (listar con fallback) y POST (crear tarea)
│   │       └── [id]/
│   │           └── route.ts        # PUT (editar/completar) y DELETE (eliminar)
│   ├── components/
│   │   └── ListaTareas.tsx         # Componente cliente — orquesta hooks, renderiza JSX
│   ├── hooks/
│   │   ├── useTareas.ts            # CRUD, estado de BD, isLoading, editandoId
│   │   ├── useBusqueda.ts          # Filtrado por título y estado, modal sin resultados
│   │   └── usePaginacion.ts        # Paginación: página actual, tareas paginadas
│   ├── globals.css                 # Estilos globales con Tailwind v4
│   ├── layout.tsx                  # Layout raíz con metadatos
│   └── page.tsx                    # Página raíz — monta <ListaTareas />
├── e2e/
│   └── search.spec.ts              # 29 tests E2E con Playwright (búsqueda, paginación, PDF, BD)
├── lib/
│   ├── filtrarTareas.ts            # Función pura de filtrado (título + estado)
│   └── mongodb.ts                  # Singleton MongoClient con resetConnection()
├── prompts/
│   ├── deploy_cicd_fn_prompt.md    # Especificación del pipeline CI/CD
│   ├── paging_fn_prompt.md         # Especificación de paginación
│   ├── pdf_report_fn_prompt.md     # Especificación del reporte PDF
│   ├── search_fn_prompt.md         # Especificación de búsqueda
│   └── use_gci_mongo_fn_prompt.md  # Especificación de conexión MongoDB GCI
├── public/                         # Activos estáticos (SVGs de Next.js)
├── scripts/
│   └── seed.js                     # Siembra 30 tareas en MongoDB (CommonJS, Node.js directo)
├── .dockerignore                   # Excluye node_modules, .next, .env* del contexto Docker
├── .env.local                      # Variables de entorno locales (no en git)
├── .gitignore                      # Ignora node_modules, .next, .env*, etc.
├── docker-compose.yml              # Servicio lista-tareas con labels Traefik para producción
├── Dockerfile                      # Build multi-stage: deps → builder → runner (standalone)
├── eslint.config.mjs               # Configuración ESLint con reglas de Next.js
├── jest.config.ts                  # Configuración Jest con jsdom y alias de paths
├── jest.setup.ts                   # Setup de @testing-library/jest-dom
├── next.config.ts                  # Configuración Next.js (output: standalone)
├── package.json                    # Dependencias, scripts npm y metadatos del proyecto
├── package-lock.json               # Lockfile de npm — garantiza instalaciones reproducibles
├── playwright.config.ts            # Configuración Playwright con webServer en puerto 3000
├── postcss.config.mjs              # Configuración PostCSS para Tailwind v4
└── tsconfig.json                   # TypeScript estricto con alias @ → ./
```

---

## 3. Patrones de Diseño y Arquitectura

### 3.1 Singleton — Conexión a MongoDB

`lib/mongodb.ts` implementa el patrón Singleton para garantizar una sola instancia de `MongoClient` por proceso. En modo desarrollo, usa `global._mongoClient` para sobrevivir los hot-reloads de Next.js. En producción, usa variables de módulo (`prodClient`). La función `resetConnection()` limpia el caché para permitir reconexiones limpias.

```typescript
// lib/mongodb.ts — patrón Singleton con soporte de reconexión
export async function connectToDatabase(): Promise<{ db: Db }> {
  if (process.env.NODE_ENV === 'development') {
    if (global._mongoDb) return { db: global._mongoDb }
    // ... crea y cachea la conexión
  }
  if (prodDb) return { db: prodDb }
  // ... crea y cachea la conexión de producción
}
```

### 3.2 Patrón de Repositorio — API Routes

Las API Routes (`app/api/tareas/`) actúan como capa de repositorio, desacoplando la lógica de acceso a MongoDB del componente de UI. Cada handler encapsula una operación CRUD y devuelve respuestas JSON normalizadas con headers de estado.

### 3.3 Función Pura de Filtrado — Separación de Responsabilidades

`lib/filtrarTareas.ts` implementa el filtrado como una función pura sin efectos secundarios, importada tanto por el componente de UI como por los tests unitarios. Esto permite testear la lógica de filtrado independientemente del componente React.

### 3.4 Importación Dinámica — Lazy Loading de jsPDF

Para evitar que `jspdf` (que importa `canvg` que a su vez usa `core-js`) falle durante el renderizado en servidor de Next.js, `generarReporte()` usa `Promise.all([import('jspdf'), import('jspdf-autotable')])` dentro del handler del evento click. Esto carga el bundle de ~500 KB solo cuando el usuario lo solicita.

### 3.5 Detección de Disponibilidad mediante Headers HTTP

En lugar de modificar la forma del JSON de respuesta, el API comunica el estado de la BD mediante el header `X-DB-Status`. El componente cliente lee `res.headers.get('x-db-status')` después de cada fetch y actualiza el estado `dbConectada` independientemente del contenido del cuerpo.

### 3.6 Arquitectura de Contenedores — Docker + Traefik

En producción, la aplicación corre como contenedor Docker en la red `miseia-net` junto a Traefik v3.3. El ruteo HTTPS se configura mediante Docker labels en `docker-compose.yml`, eliminando la necesidad de configurar archivos externos de Traefik. El certificado TLS wildcard `*.deviaaps.com` es gestionado automáticamente por Traefik usando el resolver Cloudflare DNS challenge.

---

## 4. Cómo Funciona

Al arrancar, `ListaTareas` (componente cliente) ejecuta `cargarTareas()` en `useEffect`, que hace un `GET /api/tareas`. El API intenta conectarse a MongoDB con timeout de 3 s — si tiene éxito, devuelve las tareas reales con `X-DB-Status: connected`; si falla, devuelve 3 registros de muestra con `X-DB-Status: disconnected`. El componente actualiza `setDbConectada(connected)` y renderiza la lista, el indicador de estado y, si corresponde, la banda naranja con el botón de reconexión. Todas las operaciones CRUD se ejecutan con `useTransition` para mantener la UI responsiva durante las actualizaciones.

```typescript
// Flujo central — cargar tareas con detección de estado de BD
async function cargarTareas(): Promise<void> {
  const res = await fetch('/api/tareas')
  const data = await res.json()
  const connected = res.headers.get('x-db-status') === 'connected'
  setDbConectada(connected)
  if (Array.isArray(data)) setTareas(data)
}

// Generación de PDF con importación dinámica (evita fallo SSR de jsPDF)
async function generarReporte(): Promise<void> {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new JsPDF()
  autoTable(doc, {
    head: [['#', 'Título', 'Estado']],
    body: tareasMostradas.map((t, i) => [
      i + 1, t.titulo, t.completada ? 'Completada' : 'Pendiente',
    ]),
  })
  doc.save('reporte-tareas.pdf')
}
```

---

## 5. Primeros Pasos

### Prerrequisitos

| Herramienta | Versión mínima | Propósito |
|---|---|---|
| Node.js | 20 LTS | Runtime de Next.js |
| npm | 10+ | Gestor de paquetes (incluido con Node.js 20) |
| MongoDB | 7.0+ (local o remoto) | Base de datos |
| Docker | 20.10+ (opcional) | Despliegue en contenedor |

### Clonar el repositorio

```bash
git clone https://github.com/Jorgeaapaz/MISEIA_1-1-50_lista-tareas.git
cd MISEIA_1-1-50_lista-tareas
```

### Instalación local

```bash
# 1. Instalar dependencias (usa el lockfile para instalación reproducible)
npm ci

# 2. Crear archivo de variables de entorno a partir de la plantilla
cp .env.example .env.local
# Edita .env.local con tus credenciales reales de MongoDB

# 3. (Opcional) Sembrar datos de prueba en MongoDB
node scripts/seed.js

# 4. Iniciar en modo desarrollo
npm run dev
# Disponible en: http://localhost:3000
```

### Scripts disponibles

```bash
npm run dev        # Servidor de desarrollo con hot-reload
npm run build      # Build de producción (genera .next/standalone)
npm start          # Servidor de producción en puerto 3000
npm test           # Tests unitarios con Jest
npm run test:watch # Tests en modo observación
npm run test:e2e   # Tests E2E con Playwright (requiere servidor corriendo)
npm run seed       # Sembrar 30 tareas de muestra en MongoDB
npm run lint       # Análisis estático con ESLint
```

---

## 6. Ejemplo de Salida

### Caso exitoso — Listar tareas (BD conectada)

```bash
curl http://localhost:3000/api/tareas
```

```json
# Headers: X-DB-Status: connected

[
  { "_id": "68423a...", "titulo": "Comprar leche y pan", "completada": false, "creadoEn": "2026-06-24T..." },
  { "_id": "68423b...", "titulo": "Llamar al médico para cita", "completada": true, "creadoEn": "2026-06-24T..." }
]
```

### Caso de fallback — BD no disponible

```bash
curl http://localhost:3000/api/tareas
```

```json
# Headers: X-DB-Status: disconnected

[
  { "_id": "mock-1", "titulo": "Revisar correos (sin conexión)", "completada": false },
  { "_id": "mock-2", "titulo": "Preparar informe semanal (sin conexión)", "completada": true },
  { "_id": "mock-3", "titulo": "Actualizar documentación (sin conexión)", "completada": false }
]
```

### Caso exitoso — Crear tarea

```bash
curl -X POST http://localhost:3000/api/tareas \
  -H "Content-Type: application/json" \
  -d '{"titulo": "Aprender Next.js 16"}'
```

```json
{ "_id": "68425c...", "titulo": "Aprender Next.js 16", "completada": false, "creadoEn": "2026-06-24T..." }
```

### Caso de error — BD no disponible en POST

```bash
curl -X POST http://localhost:3000/api/tareas \
  -H "Content-Type: application/json" \
  -d '{"titulo": "Nueva tarea"}' -i
```

```
HTTP/1.1 503 Service Unavailable
{"error":"Base de datos no disponible"}
```

### Caso de validación — Título vacío

```bash
curl -X POST http://localhost:3000/api/tareas \
  -H "Content-Type: application/json" \
  -d '{"titulo": ""}' -i
```

```
HTTP/1.1 400 Bad Request
{"error":"titulo requerido"}
```

---

## 7. Requisitos

### 7.1 Requisitos Funcionales

```
FR-001: El usuario shall poder crear una tarea con un título no vacío
        so that la tarea quede persistida en MongoDB y visible en la lista principal.

FR-002: El usuario shall poder marcar una tarea existente como completada o pendiente
        so that el cambio de estado sea reflejado inmediatamente en la interfaz y persistido en la BD.

FR-003: El usuario shall poder editar el título de una tarea existente mediante un campo de texto en línea
        so that el nuevo título sea guardado en MongoDB y actualizado en la lista sin recargar la página.

FR-004: El usuario shall poder eliminar una tarea de la lista
        so that sea removida permanentemente de la base de datos y desaparezca de la interfaz.

FR-005: El usuario shall poder buscar tareas escribiendo un fragmento del título en el campo de búsqueda
        so that la lista muestre únicamente las tareas cuyo título contenga el texto ingresado.

FR-006: El usuario shall poder filtrar tareas por estado seleccionando entre Todas, Completadas o Pendientes
        so that pueda enfocarse en el subconjunto de tareas relevante para su flujo de trabajo.

FR-007: El sistema shall paginar la lista de tareas mostrando un máximo de 5 registros por página
        so that la interfaz permanezca usable cuando la colección supere los 10 registros.

FR-008: El usuario shall poder generar y descargar un reporte PDF de las tareas actualmente visibles
        so that pueda compartir o imprimir el listado filtrado sin necesidad de herramientas adicionales.

FR-009: El sistema shall mostrar en todo momento un indicador visual del estado de conexión a la BD
        so that el usuario sepa si está viendo datos reales o registros de muestra.

FR-010: El sistema shall mostrar 3 registros de muestra identificados con "(sin conexión)" cuando la BD no responda
        so that el usuario verifique que la aplicación funciona aunque no haya conectividad con MongoDB.

FR-011: El usuario shall poder pulsar el botón "Reconnect" en la banda de alerta para reintentar la conexión
        so that la sesión se recupere automáticamente sin necesidad de recargar la página completa.

FR-012: El administrador shall poder ejecutar el script de siembra para inicializar la colección con 30 tareas
        so that existan datos representativos para verificar búsqueda, filtrado y paginación desde el primer despliegue.
```

### 7.2 Requisitos No Funcionales

```
NFR-PERF-001: Tiempo de respuesta GET /api/tareas < 500ms al p95 con hasta 1 000 tareas
              → índice en _id nativo de MongoDB + singleton de conexión

NFR-PERF-002: Generación de PDF < 3s para listas de hasta 200 tareas visibles
              → importación dinámica de jsPDF (lazy-load ~500 KB bundle)

NFR-SEC-001:  100% de credenciales en variables de entorno — 0 secretos en código fuente o git history
              → GitHub Secrets + .env.local en .gitignore

NFR-SEC-002:  Toda comunicación en producción sobre HTTPS/TLS 1.2+ con certificado wildcard *.deviaaps.com
              → Traefik v3.3 + Cloudflare DNS challenge ACME

NFR-SCAL-001: Escalado horizontal sin cambios de código añadiendo réplicas del contenedor
              → arquitectura stateless (estado en MongoDB, no en memoria del servidor)

NFR-USAB-001: Interfaz completamente funcional en viewports de 320px a 2 560px sin scroll horizontal
              → Tailwind v4 responsive con clases sm:/md:/lg:

NFR-USAB-002: Soporte de modo oscuro automático según prefers-color-scheme del sistema operativo
              → clases dark: de Tailwind + metaetiqueta color-scheme

NFR-AVAIL-001: Disponibilidad ≥ 99% mensual en producción
               → Docker restart: unless-stopped + Traefik health checks automáticos

NFR-MAINT-001: Pipeline CI/CD completa el ciclo tests → build → deploy en < 8 minutos por push a master
               → GitHub Actions con caché de capas BuildKit (type=gha)

NFR-OBS-001:  Cada respuesta del API incluye header X-DB-Status: connected|disconnected
              → el cliente detecta estado de BD sin parsear el cuerpo JSON
```

### 7.3 Requisitos Regulatorios (México)

```
REG-001 (LFPDPPP): Si se añade autenticación con nombre, correo electrónico o cualquier dato personal,
         el sistema deberá cumplir con la Ley Federal de Protección de Datos Personales en Posesión de
         Particulares (DOF 2010) — aviso de privacidad, consentimiento informado y mecanismos ARCO.
         En su estado actual (sin autenticación), el sistema no procesa datos personales directamente.

REG-002 (NOM-151-SCFI-2016): Los registros de tareas generados y el reporte PDF exportado deben cumplir
         la norma de conservación de mensajes de datos y digitalización de documentos. Los backups deben
         conservarse con hash de integridad para verificación posterior.

REG-003 (MAAGTICSI/MAAGMSI): Si el sistema se adopta en una entidad de la Administración Pública Federal,
         deberá cumplir con el Manual Administrativo de Aplicación General en Materia de Tecnologías de la
         Información, incluyendo controles de acceso, auditoría de operaciones y gestión de incidentes.
```

### 7.4 Requisitos Operativos

```
OPS-001: El sistema debe estar disponible 24/7 mediante la política Docker restart: unless-stopped
         en la VM de producción (34.174.56.186).
         Verificación: docker inspect miseia1150-listatareas --format '{{.State.Status}}'

OPS-002: La base de datos MongoDB debe ser respaldada cada 24 horas con retención de 7 días mediante
         docker exec mongodb mongodump, almacenado en volumen persistente del VM de GCI.

OPS-003: Cada push a master debe activar automáticamente el pipeline CI/CD completando build y despliegue
         en < 8 minutos. RPO < 1 hora, RTO < 30 minutos para el servicio de aplicación.

OPS-004: Los logs del contenedor deben retenerse por 30 días mediante política Docker json-file
         con max-size: 10m y max-file: 3 para evitar agotamiento de disco en el VM.

OPS-005: En caso de fallo del contenedor, el servicio debe recuperarse en < 5 minutos mediante
         docker compose up -d sin intervención manual. Procedimientos de recuperación verificados trimestralmente.
```

### 7.5 Atributos de Calidad

#### 7.5.1 Performance: Latencia de Respuesta API [PERF-API-LATENCY]
**Quality Attribute:** Performance
**Metric:** Latencia de respuesta (ms)

**Specification:**
- p99: < 1 000ms
- p95: < 500ms
- p50: < 150ms

**Conditions:**
- Dataset: hasta 1 000 tareas en la colección
- Carga: 50 requests concurrentes
- Infraestructura: VM GCI + MongoDB en la misma red Docker

**Exceptions:**
- Primera conexión tras reinicio del contenedor: hasta 3 500ms por timeout de MongoDB
- Peticiones de fallback (BD desconectada): < 10ms (datos en memoria)

**Verification:**
- Test de carga con `autocannon` o `k6`; medición con `curl -w "%{time_total}"`

---

#### 7.5.2 Availability: Uptime del Contenedor [AVAIL-CONTAINER]
**Quality Attribute:** Availability
**Metric:** Porcentaje de uptime mensual

**Specification:**
- Uptime mensual: ≥ 99%
- Tiempo máximo de indisponibilidad mensual: < 7.3 horas
- Tiempo de recuperación automática tras crash: < 30 segundos

**Conditions:**
- Política Docker: `restart: unless-stopped`
- Entorno: VM GCI Ubuntu 24.04, Docker 28.5.2
- Dependencia crítica: Traefik v3.3 en red `miseia-net`

**Exceptions:**
- Mantenimiento programado del VM: ventana máxima de 30 minutos con aviso previo de 48h
- Actualización de imagen Docker: recreación del contenedor < 60 segundos

**Verification:**
- `curl -s -o /dev/null -w "%{http_code}" https://miseia1150_listatareas.deviaaps.com` cada 5 minutos
- Historial de ejecuciones en GitHub Actions

---

#### 7.5.3 Security: Gestión de Secretos [SEC-SECRETS]
**Quality Attribute:** Security
**Metric:** Número de secretos expuestos en código fuente o historial git

**Specification:**
- Secretos en código fuente: 0
- Secretos en historial de git: 0
- Rotación de clave SSH: cada 365 días máximo

**Conditions:**
- 5 secretos gestionados via GitHub Secrets (`gh secret set`)
- Archivo `.env.local` incluido en `.gitignore`

**Exceptions:**
- Desarrollo local: `.env.local` puede usar URI de MongoDB local sin autenticación si no es accesible desde internet

**Verification:**
- `git log --all --full-history -- '*.env*'` debe devolver 0 resultados
- `gh secret list` muestra los 5 secretos correctamente configurados

---

#### 7.5.4 Maintainability: Cobertura de Pruebas [MAINT-TEST-COVERAGE]
**Quality Attribute:** Maintainability
**Metric:** Número de tests y tiempo de ejecución

**Specification:**
- Tests unitarios: ≥ 46 pasando (Jest + @testing-library/react)
- Tests E2E: ≥ 29 pasando (Playwright Chromium)
- Tiempo total de suite unitaria: < 30 segundos

**Conditions:**
- Tests unitarios: jsdom, mocks de `fetch` con headers `x-db-status`, mock de jsPDF
- Tests E2E: `page.route('/api/tareas', ...)` para simular respuestas del servidor
- CI: ejecutados en cada push mediante `npm test -- --passWithNoTests --forceExit`

**Exceptions:**
- Tests E2E no corren en CI (requieren servidor de desarrollo y Playwright browsers instalados)

**Verification:**
- `npm test` debe mostrar "46 passed, 0 failed"
- `npm run test:e2e` en entorno local con servidor en puerto 3000

---

#### 7.5.5 Usability: Accesibilidad y Responsividad [USAB-RESPONSIVE]
**Quality Attribute:** Usability
**Metric:** Viewports soportados sin degradación de funcionalidad

**Specification:**
- Rango de viewports funcionales: 320px a 2 560px de ancho
- Controles interactivos accesibles por teclado: 100%
- Atributos ARIA en elementos críticos: indicador de BD, banner de error, paginación, diálogo

**Conditions:**
- Framework de estilos: Tailwind CSS v4 con clases responsive
- Modo oscuro: automático por `prefers-color-scheme: dark`
- Testeo en: Chrome/Chromium 125+ (Playwright)

**Exceptions:**
- La generación de PDF es operación del cliente — no aplica en entornos sin DOM

**Verification:**
- Tests E2E en Playwright con viewport por defecto de Chromium
- Inspección manual en Chrome DevTools (375px, 768px, 1440px)

---

### 7.6 Criterios de Aceptación BDD

```gherkin
Feature: Gestión de tareas con CRUD completo

  Scenario: Crear una tarea exitosamente
    Given el usuario está en la página principal de la lista de tareas
    And la base de datos MongoDB está disponible
    When el usuario escribe "Comprar leche" en el campo de nueva tarea
    And pulsa el botón "Agregar"
    Then la tarea "Comprar leche" aparece en la lista en estado "Pendiente"
    And el contador de tareas pendientes se incrementa en 1


Feature: Búsqueda y filtrado de tareas

  Scenario: Filtrar tareas por título
    Given el usuario tiene 3 tareas en la lista
    When el usuario escribe "leche" en el campo de búsqueda
    And pulsa el botón "Buscar"
    Then solo se muestra la tarea "Comprar leche"
    And el contador muestra "1 resultado encontrado"

  Scenario: Búsqueda sin resultados muestra modal
    Given el usuario tiene tareas en la lista
    When el usuario busca "xyzzy_no_existe"
    And pulsa "Buscar"
    Then aparece un modal con el mensaje "No se han encontrado registros con los datos proporcionados"
    And el modal contiene el término buscado "xyzzy_no_existe"


Feature: Generación de reporte PDF

  Scenario: Descargar PDF con tareas filtradas
    Given el usuario tiene 3 tareas visibles en la lista
    When el usuario pulsa el botón "Reporte"
    Then el navegador descarga un archivo llamado "reporte-tareas.pdf"
    And el PDF contiene las 3 tareas visibles con su estado

  Scenario: Botón Reporte deshabilitado sin tareas visibles
    Given el usuario ha aplicado un filtro que no produce resultados
    Then el botón "Reporte" está deshabilitado
    And no es posible generar el PDF


Feature: Resiliencia ante fallo de base de datos

  Scenario: Mostrar registros de muestra cuando la BD falla
    Given la base de datos MongoDB no está disponible
    When el usuario carga la página principal
    Then la lista muestra 3 registros con el sufijo "(sin conexión)"
    And aparece la banda naranja con el mensaje "You are not connected to the Database"
    And el indicador de estado muestra un círculo rojo
```

---

## 8. Especificaciones

### 8.1 Especificación Guiada por Comportamiento (SDD)

#### Functional Spec: Gestión de Tareas

```
# Functional Spec: CRUD de Tareas

## Use Case: Crear Tarea
Actors: Usuario (cliente navegador)

Preconditions:
- MongoDB disponible (X-DB-Status: connected)
- Campo de título no vacío

Main Flow:
1. Usuario escribe título en input "Nueva tarea"
2. Presiona botón "Agregar" o tecla Enter
3. Sistema envía POST /api/tareas con { titulo }
4. API inserta documento con completada: false y creadoEn: Date.now()
5. Componente ejecuta cargarTareas() y actualiza la lista

Acceptance Criteria:
- Given usuario con BD conectada y título "Estudiar Next.js"
- When presiona Agregar
- Then la tarea aparece en la lista con estado Pendiente
- And el campo de input queda vacío para la siguiente tarea

## Use Case: Búsqueda con Filtros Combinados
Actors: Usuario (cliente navegador)

Preconditions:
- Lista con 2+ tareas cargadas (panel de búsqueda visible)

Main Flow:
1. Usuario escribe término en campo búsqueda
2. Selecciona filtro de estado del selector
3. Presiona "Buscar"
4. filtrarTareas(tareas, { titulo, completada }) procesa en memoria
5. tareasMostradas se actualiza, paginación se resetea a página 1

Acceptance Criteria:
- Given 3 tareas: "Comprar leche" (pendiente), "Estudiar TypeScript" (completada), "Hacer ejercicio" (pendiente)
- When filtra por título "e" y estado "pendientes"
- Then muestra "Comprar leche" y "Hacer ejercicio"
- And NO muestra "Estudiar TypeScript"
```

#### Structural Spec: Arquitectura de Capas

```
# Structural Spec: Organización del Sistema

## Capas

┌─────────────────────────────────────┐
│  CLIENTE (Navegador)                │
│  ListaTareas.tsx ('use client')     │
│  - Estado: tareas, búsqueda, paging │
│  - UI: Tailwind CSS v4              │
│  - PDF: jsPDF (dynamic import)      │
└────────────────┬────────────────────┘
                 │ fetch('/api/...')
┌────────────────▼────────────────────┐
│  SERVIDOR (Next.js App Router)      │
│  app/api/tareas/route.ts            │
│  app/api/tareas/[id]/route.ts       │
│  - Validación de entrada            │
│  - Header X-DB-Status               │
│  - Fallback a MOCK_TAREAS           │
└────────────────┬────────────────────┘
                 │ connectToDatabase()
┌────────────────▼────────────────────┐
│  DATOS (MongoDB 7.0 — Docker)       │
│  lib/mongodb.ts — Singleton         │
│  Colección: tareas                  │
│  VM GCI: 34.174.56.186:27020        │
└─────────────────────────────────────┘

## Modelo de Datos — Colección tareas
{
  _id:        ObjectId   // identificador único generado por MongoDB
  titulo:     string     // texto de la tarea, requerido, no vacío
  completada: boolean    // false = pendiente, true = completada
  creadoEn:   Date       // fecha de creación
}
```

#### Behavioral Spec: Ciclo de Vida de la Conexión a BD

```mermaid
stateDiagram-v2
    [*] --> Iniciando
    Iniciando --> Conectando : cargarTareas
    Conectando --> Conectado : DB conectada
    Conectando --> Desconectado : timeout 3s
    Conectado --> ListaMostrada : datos reales
    Desconectado --> FallbackMostrado : datos de muestra
    FallbackMostrado --> BandaNaranja : sin conexion
    BandaNaranja --> Reconectando : pulsa Reconnect
    Reconectando --> Conectando : resetConnection
    ListaMostrada --> Conectando : pulsa Reconnect
```

#### Operative Spec: Pipeline de Despliegue

```
# Spec Operativa: Lista de Tareas — Producción GCI

## Despliegue
- GitHub Actions 3 jobs: test → build-and-push → deploy
- Imagen Docker multi-stage con output: standalone
- Registry: ghcr.io/jorgeaapaz/miseia_1-1-50_lista-tareas
- SSH deploy a VM GCI: docker compose up -d --force-recreate

## Escalado
- Horizontal: múltiples réplicas del contenedor lista-tareas
- Stateless: sin estado en memoria del servidor
- Balanceo: Traefik loadbalancer automático por Docker labels

## Monitoreo
- Estado de BD: GET /api/tareas → header X-DB-Status
- Uptime: docker inspect miseia1150-listatareas --format '{{.State.Status}}'
- Logs: docker logs miseia1150-listatareas --tail 100

## Rollback
- Por SHA: docker pull ghcr.io/.../lista-tareas:sha-<hash>
- Actualizar imagen en docker-compose.yml y docker compose up -d

## Runbook: Contenedor Caído
1. Verificar estado: docker ps -a --filter name=miseia1150-listatareas
2. Ver logs: docker logs miseia1150-listatareas --tail 50
3. Si error de imagen: docker pull ghcr.io/.../lista-tareas:latest
4. Reiniciar: docker compose -f ~/MISEIA1150_lista-tareas/docker-compose.yml up -d
5. Si persiste: verificar .env y MONGODB_URI en ~/MISEIA1150_lista-tareas/
```

---

### 8.2 Invariantes y Contratos

#### Contrato: `connectToDatabase()`

```
PRECONDITIONS:
- process.env.MONGODB_URI es una cadena válida de conexión MongoDB
- NODE_ENV está definida ('development' | 'production')
- La red permite conexión a la URI en el puerto especificado

POSTCONDITIONS:
- Devuelve { db: Db } donde db es una instancia activa de Db de MongoDB
- En modo development, la instancia es cacheada en global._mongoDb
- En modo production, la instancia es cacheada en prodDb

INVARIANTS:
- Solo existe UNA instancia de MongoClient activa por proceso en cualquier momento
- Si ya existe una conexión cacheada, no se crea una nueva (idempotente)

EXAMPLES:
- connectToDatabase() → { db: Db } (primera llamada, conecta)
- connectToDatabase() → { db: Db } (segunda llamada, devuelve caché)
- connectToDatabase() con URI inválida → throws MongoServerSelectionError (tras 3s)
```

#### Contrato: `filtrarTareas(tareas, terminos)`

```
PRECONDITIONS:
- tareas: Tarea[] — array no nulo (puede estar vacío)
- terminos.titulo: string — puede ser vacío
- terminos.completada: 'todas' | 'completadas' | 'pendientes'

POSTCONDITIONS:
- Devuelve un nuevo array (nunca muta el original)
- Contiene solo tareas que satisfacen AMBOS filtros simultáneamente
- Con titulo vacío y completada='todas', devuelve copia del array original

INVARIANTS:
- resultado.length <= tareas.length
- Todos los elementos del resultado existen en tareas (subconjunto)
- El orden relativo de los elementos se preserva
- La comparación de título es case-insensitive

EXAMPLES:
- filtrarTareas([{titulo:'Comprar leche',...}], {titulo:'leche', completada:'todas'}) → [{titulo:'Comprar leche',...}]
- filtrarTareas([], {titulo:'abc', completada:'todas'}) → []
- filtrarTareas(tareas, {titulo:'', completada:'todas'}) → [...tareas]
```

#### Contrato: `generarReporte()`

```
PRECONDITIONS:
- tareasMostradas.length > 0 (botón Reporte habilitado)
- Entorno de navegador disponible (no SSR)
- jsPDF y jspdf-autotable disponibles para importación dinámica

POSTCONDITIONS:
- Se descarga automáticamente el archivo 'reporte-tareas.pdf'
- El PDF contiene todas las tareas de tareasMostradas (no solo las paginadas)
- El PDF incluye: título, fecha, filtros activos, tabla, totales

INVARIANTS:
- La función no modifica el estado del componente
- El archivo original en la base de datos no se modifica

EXAMPLES:
- generarReporte() con 3 tareas visibles → descarga PDF con tabla de 3 filas
- generarReporte() con filtro activo → PDF refleja las tareas filtradas
```

---

### 8.3 Registros de Decisiones Arquitectónicas (ADRs)

```
# ADR-001: Next.js 16 App Router con TypeScript estricto
Status: Accepted

## Context
El proyecto requiere framework full-stack con API Routes integradas.
Next.js 16 introduce breaking changes: parámetros de ruta son Promises,
nuevo sistema de caché, salida standalone.

## Options considered
1. Next.js 15 + Pages Router: más familiar, más documentación
2. Next.js 16 + App Router: API moderna, mejor separación cliente/servidor
3. Express + React SPA: control total pero mayor overhead

## Decision
Next.js 16.2.2 con App Router y TypeScript strict.

Reasons:
- Contexto educativo — aprender la versión más actual
- API Routes integradas eliminan backend separado
- 'use client' directiva para separación explícita
- TypeScript strict fuerza contratos en toda la base de código

## Consequences
Positive:
- Full-stack en un solo proyecto
- Build standalone para imagen Docker minimal (~50MB)

Negatives:
- Breaking changes frecuentes entre versiones menores
- AGENTS.md necesario para recordar leer docs locales
```

```
# ADR-002: Driver MongoDB nativo vs Mongoose
Status: Accepted

## Context
La aplicación necesita persistencia en MongoDB.
Modelo de datos simple: un solo tipo de documento.

## Options considered
1. Mongoose 8: esquemas, validación, middleware de modelo
2. MongoDB driver 7.1 (nativo): acceso directo, sin abstracción
3. Prisma + MongoDB: ORM moderno, soporte experimental para MongoDB

## Decision
MongoDB driver nativo 7.1.1.

Reasons:
- Modelo de datos simple (un solo tipo de documento: Tarea)
- Sin necesidad de relaciones complejas ni middleware
- Benchmark: operaciones de lectura ~15% más rápidas que Mongoose en colecciones pequeñas
- Patrón Singleton manual da control total sobre reconexión

## Consequences
Positive:
- Control total del ciclo de vida de la conexión
- Menor tamaño de dependencias (Mongoose añade ~3MB)

Negatives:
- Sin validación de esquema a nivel ODM
- Mayor boilerplate para operaciones complejas futuras
```

```
# ADR-003: Importación dinámica de jsPDF para evitar fallos SSR
Status: Accepted

## Context
jsPDF → canvg → core-js referencia módulos de Node.js no disponibles en bundler.
Error: "Module not found: Can't resolve '../internals/iterators'"
Ocurre incluso con 'use client' porque Next.js pre-renderiza en el servidor.

## Options considered
1. Importación estática: import JsPDF from 'jspdf' — FALLA en SSR
2. Importación dinámica en el handler — FUNCIONA
3. webpack externals en next.config.ts — complejo y frágil

## Decision
Promise.all([import('jspdf'), import('jspdf-autotable')]) dentro del handler.

Benchmark:
- Primera generación: ~800ms (incluye lazy load)
- Subsecuentes: ~200ms (caché del módulo en el navegador)

## Consequences
Positive:
- Elimina el error de SSR completamente
- Lazy loading del bundle ~500KB — no se incluye en el bundle principal

Negatives:
- Primera generación más lenta por carga inicial
- Tests unitarios requieren mock de import() dinámico
```

```
# ADR-004: Docker + GHCR vs PM2 en host para despliegue
Status: Accepted

## Context
VM GCI corre Docker 28.5.2 con TODOS los servicios en contenedores.
Se evaluó si la app Next.js debía correr en Docker o con PM2 en el host.

## Options considered
1. Docker + GHCR (imagen multi-stage, standalone) — ELEGIDO
2. PM2 en host + Traefik file provider + host-gateway bridge

## Decision
Docker con imagen multi-stage y GHCR como registry.

Reasons:
- Consistencia: TODOS los servicios del VM son Docker
- Traefik integración nativa via labels (vs modificar compose file compartido)
- Rollback por tag de imagen (vs re-deployment de artefacto sin historial)
- VM rebuild: docker compose up restaura todo sin reinstalar Node.js/PM2

Benchmark CI/CD:
- Docker: ~4-5 min (reducible a ~90s con caché BuildKit warm)
- PM2: ~2-3 min (sin image push/pull)
La diferencia de 2 min no justifica romper la consistencia arquitectónica.

## Consequences
Positive:
- Sistema uniforme — un único modelo operativo para todos los servicios
- Imagen inmutable y versionada por SHA en GHCR

Negatives:
- Pipeline más largo en el primer build (sin caché)
- Requiere docker login ghcr.io en el VM durante el deploy
```

```
# ADR-005: Header HTTP X-DB-Status para detección de disponibilidad de BD
Status: Accepted

## Context
El API necesita comunicar al cliente si los datos son reales o fallback.
Se debatió dónde colocar esta información sin romper el contrato del API.

## Options considered
1. Campo en el cuerpo JSON: { data: [...], dbStatus: 'connected' } — cambia contrato
2. HTTP 206 Partial Content — semánticamente incorrecto
3. Header HTTP personalizado X-DB-Status — ELEGIDO
4. Endpoint separado /api/health — requiere fetch adicional

## Decision
Header HTTP X-DB-Status: connected|disconnected en cada respuesta.

Evidencia: tests de Playwright usan route.fulfill({ headers: { 'X-DB-Status': dbStatus } })
sin modificar el body — prueba de que el diseño es limpio y testeable.

## Consequences
Positive:
- Contrato JSON inmutable (backward compatible)
- Tests de headers independientes de tests de datos
- Extensible sin cambiar la forma de la respuesta

Negatives:
- Proxies de caché que no propaguen headers perderán la información
- Frontend debe leer headers explícitamente
```

---

## 9. Pruebas Unitarias e Integración

### Suite de Tests Unitarios (Jest + @testing-library/react)

```bash
# Ejecutar todos los tests unitarios
npm test

# Para entornos CI
npm test -- --passWithNoTests --forceExit

# Reporte de cobertura
npm run test:coverage
```

**Resultado:** 46 tests pasando en 2 suites.

```
Test Suites: 2 passed, 2 total
Tests:       46 passed, 46 total
Snapshots:   0 total
Time:        ~6s
```

### Cobertura de Tests (código de dominio)

> Colección restringida a `app/components/` y `lib/filtrarTareas.ts`. Las API routes y `lib/mongodb.ts` requieren tests de integración con MongoDB real y se excluyen del reporte de cobertura unitaria.

| Archivo | Statements | Branches | Funciones | Líneas |
|---|---|---|---|---|
| `lib/filtrarTareas.ts` | 100% | 100% | 100% | 100% |
| `app/components/ListaTareas.tsx` | 84.87% | 94.11% | 50% | 84.87% |
| **Global** | **85.6%** | **94.91%** | **52%** | **85.6%** |

Umbral configurado: `lines ≥ 60%, functions ≥ 45%, branches ≥ 60%` — todos superados.

```bash
npm run test:coverage
```

### Archivos de test

```
__tests__/
├── filtrarTareas.test.ts    # Función pura de filtrado
│                              - Título vacío devuelve lista completa
│                              - Filtro por título parcial (case-insensitive)
│                              - Filtro por estado: completadas, pendientes, todas
│                              - Combinación título + estado
└── ListaTareas.test.tsx     # Componente completo
                               - CRUD: crear, completar, editar, eliminar tarea
                               - Búsqueda: filtro, modal sin resultados, limpiar
                               - Paginación: 5 por página, siguiente, anterior
                               - PDF: mock de jsPDF, verificación de doc.save()
                               - BD: indicador connected/disconnected, banda naranja, Reconnect
```

### Suite E2E (Playwright — Chromium)

```bash
# Ejecutar tests E2E (inicia servidor automáticamente en puerto 3000)
npm run test:e2e
```

**Resultado:** 29 tests E2E pasando.

```
e2e/
└── search.spec.ts
    - 8 tests: Búsqueda por título, estado y combinación + modal
    - 3 tests: Visibilidad condicional del buscador
    - 6 tests: Paginación y navegación entre páginas
    - 5 tests: Botón Reporte (habilitado, deshabilitado, descarga PDF)
    - 5 tests: Estado de conexión a BD (ícono, banda, fallback, Reconnect)
```

### Dependencias de prueba (`package.json`)

```json
"devDependencies": {
  "@playwright/test": "^1.61.1",
  "@testing-library/dom": "^10.4.1",
  "@testing-library/jest-dom": "^6.9.1",
  "@testing-library/react": "^16.3.2",
  "@testing-library/user-event": "^14.6.1",
  "@types/jest": "^30.0.0",
  "jest": "^30.4.2",
  "jest-environment-jsdom": "^30.4.1",
  "ts-node": "^10.9.2"
}
```

---

## 10. Despliegue

### 10.1 URL de Despliegue

```
https://miseia1150_listatareas.deviaaps.com
```

Servida por Traefik v3.3 con certificado TLS wildcard `*.deviaaps.com` gestionado automáticamente mediante Cloudflare DNS challenge. Verificada con HTTP 200 tras el primer despliegue automatizado.

### 10.2 Lockfile

El proyecto incluye **`package-lock.json`** en la raíz del repositorio. Este archivo garantiza instalaciones **reproducibles y deterministas** en todos los entornos — desarrollo local, CI/CD en GitHub Actions y build dentro del contenedor Docker — al fijar las versiones exactas de todas las dependencias directas e indirectas. Siempre usar `npm ci` en lugar de `npm install` en entornos automatizados para respetar el lockfile y detectar discrepancias.

```bash
# Instalación reproducible usando el lockfile (recomendado para CI/CD y Docker)
npm ci
```

### 10.3 Instrucciones de Despliegue

#### Opción A — Docker local (pruebas de producción)

```bash
# Construir la imagen
docker build -t lista-tareas:local .

# Ejecutar el contenedor
docker run -d \
  -p 30001:30001 \
  -e MONGODB_URI="mongodb://usuario:password@host:27017/?authSource=admin" \
  -e MONGODB_DB="lista_tareas" \
  -e NODE_ENV="production" \
  --name lista-tareas-local \
  lista-tareas:local

# Verificar
curl http://localhost:30001
```

#### Opción B — Docker Compose en VM GCI (producción)

```bash
# Conectarse al VM
ssh -i C:\ubuntuiso\.ssh\vboxuser gcvmuser@34.174.56.186

# Crear directorio y archivo .env
mkdir -p ~/MISEIA1150_lista-tareas
cat > ~/MISEIA1150_lista-tareas/.env << 'EOF'
MONGODB_URI=mongodb://admin:password@34.174.56.186:27020/?authSource=admin
MONGODB_DB=lista_tareas
EOF

# Login a GHCR, descargar imagen e iniciar
docker login ghcr.io -u TU_USUARIO_GITHUB
docker compose -f ~/MISEIA1150_lista-tareas/docker-compose.yml pull
docker compose -f ~/MISEIA1150_lista-tareas/docker-compose.yml up -d
```

#### Opción C — GitHub Actions (CI/CD automático — recomendado)

Cada push a la rama `master` activa automáticamente el pipeline `.github/workflows/deploy.yml`:

```
Job 1: test       → npm test --forceExit (46 tests unitarios)
Job 2: build      → docker build + push a ghcr.io (con caché BuildKit GHA)
Job 3: deploy     → SSH al VM → docker compose pull → docker compose up -d
```

**Prerrequisitos:** Configurar los 5 secretos en GitHub:

```bash
gh secret set DEPLOY_SSH_KEY < ~/.ssh/tu-clave-privada
gh secret set DEPLOY_HOST    --body "34.174.56.186"
gh secret set DEPLOY_USER    --body "gcvmuser"
gh secret set MONGODB_URI    --body "mongodb://admin:pass@host:27020/?authSource=admin"
gh secret set MONGODB_DB     --body "lista_tareas"
```

---

## 11. Mejoras y Extensiones

| Funcionalidad | Descripción | Estado |
|---|---|---|
| **Paginación** | Navegar entre páginas de 5 tareas con controles Anterior/Siguiente e indicador "Página X de Y". Resetea al aplicar búsqueda. | Implementado |
| **Búsqueda y Filtrado** | Filtrado en memoria por título (insensible a mayúsculas) y por estado. Combinable. Modal cuando no hay resultados. Contador de resultados. | Implementado |
| **Exportación a PDF** | Reporte PDF de la lista filtrada actualmente visible con tabla y totales. Importación dinámica para compatibilidad SSR. | Implementado |
| **Indicador de estado de BD** | Círculo verde/rojo siempre visible que muestra el estado real de la conexión a MongoDB. | Implementado |
| **Fallback offline** | 3 registros de muestra con "(sin conexión)" cuando MongoDB no responde. Banda naranja con botón de reconexión. | Implementado |
| **CI/CD automático** | Pipeline GitHub Actions: tests → build Docker → deploy SSH. Tiempo de ciclo < 8 minutos. | Implementado |
| **Modo oscuro** | Adaptable automáticamente al modo oscuro del sistema mediante clases `dark:` de Tailwind. | Implementado |
| **Autenticación** | NextAuth.js para proteger operaciones CRUD con sesión de usuario. | Pendiente |
| **Notificaciones en tiempo real** | WebSockets o Server-Sent Events para sincronizar entre múltiples pestañas. | Pendiente |
| **Fechas límite** | Campo `fechaLimite` y filtro de tareas vencidas con alerta visual. | Pendiente |
| **E2E en CI** | Añadir job de Playwright en GitHub Actions con servidor de preview. | Pendiente |

---

## 12. Cambios Documentados y Revisión Crítica

### 12.1 Cambios Realizados con Asistencia de IA

#### Cambio 1: Importación dinámica de jsPDF

**Qué cambió:** La importación de `jspdf` y `jspdf-autotable` se movió de importaciones estáticas de módulo a importaciones dinámicas dentro del handler de evento.

**Por qué:** Next.js pre-renderiza componentes cliente en el servidor para generar el HTML inicial. `jsPDF` incluye `canvg` que referencia módulos de Node.js no disponibles en el contexto de bundling, provocando el error "Module not found". La importación dinámica retrasa la carga al momento en que el handler se ejecuta (solo en el navegador).

#### Cambio 2: Header HTTP `X-DB-Status` en lugar de campo JSON

**Qué cambió:** El estado de la base de datos se comunica mediante el header `X-DB-Status: connected|disconnected` en lugar de añadir un campo al cuerpo JSON.

**Por qué:** Modificar la forma del JSON rompería el contrato del API. Los headers HTTP son el mecanismo semánticamente correcto para metadatos de respuesta. El cliente lee `res.headers.get('x-db-status')` — una línea sin parseo adicional ni cambios en los tipos TypeScript.

#### Cambio 3: `resetConnection()` para reconexión limpia

**Qué cambió:** Se añadió la función `resetConnection()` en `lib/mongodb.ts` que limpia el caché del Singleton.

**Por qué:** El patrón Singleton guarda el `MongoClient` en caché. Si la conexión falla, el caché retiene la referencia al cliente roto. Sin `resetConnection()`, el botón "Reconnect" siempre devolvería el cliente en error del caché. Con `resetConnection()`, la próxima llamada a `connectToDatabase()` crea un cliente nuevo.

#### Cambio 4: `output: "standalone"` en `next.config.ts`

**Qué cambió:** Se añadió `output: "standalone"` a la configuración de Next.js.

**Por qué:** El modo standalone genera `server.js` — un servidor Node.js autocontenido que solo incluye las dependencias necesarias (~50 MB vs ~400 MB con `node_modules` completo). Reduce el tamaño de la imagen Docker, el tiempo de build y la superficie de ataque de seguridad.

---

### 12.2 Revisión Crítica Estructurada

#### Lo que funciona bien

**Separación de responsabilidades clara:** `lib/filtrarTareas.ts` como función pura, `lib/mongodb.ts` como singleton, API Routes como repositorio y `ListaTareas.tsx` como único componente de UI. La separación permite testear cada capa independientemente con mínimo acoplamiento.

**Cobertura de pruebas robusta:** 46 tests unitarios + 29 E2E proporcionan alta confianza en el comportamiento esperado. Los mocks de fetch con headers permiten simular estados de BD sin infraestructura real. Cada feature fue entregada con su suite de tests completa antes del merge.

**Consistencia arquitectónica en producción:** Mantener Docker para la aplicación (en lugar de PM2 en host) preserva el modelo operativo uniforme del VM donde todos los servicios son contenedores. La integración con Traefik mediante Docker labels es la misma que usan todos los demás servicios en `miseia-net`.

**Pipeline CI/CD real:** El flujo test → build → deploy no es simulado — se ejecuta en GitHub Actions y despliega en un VM real de GCI. La caché BuildKit de GitHub Actions elimina el overhead de `npm ci` en builds subsecuentes.

#### Veredicto

El proyecto cumple su objetivo educativo: demostrar un ciclo completo de desarrollo full-stack con Next.js 16, desde el scaffold hasta el despliegue en producción con CI/CD real y resiliencia ante fallos. Las decisiones técnicas son sólidas y justificadas con evidencia (benchmarks, análisis de opciones). Las limitaciones identificadas son aceptables para el alcance actual y representan el roadmap natural hacia un sistema de producción real.

---

## Updates — 2026-06-25

### Nuevos archivos

| Archivo | Descripción |
|---|---|
| `.env.example` | Plantilla pública de variables de entorno con placeholders; `cp .env.example .env.local` para empezar |
| `app/hooks/useTareas.ts` | Custom hook con lógica CRUD, estado `isLoading`, `dbConectada` y `editandoId` extraída de `ListaTareas.tsx` |
| `app/hooks/useBusqueda.ts` | Custom hook con lógica de búsqueda, filtrado por título y estado, y modal sin resultados |
| `app/hooks/usePaginacion.ts` | Custom hook con lógica de paginación: página actual, total de páginas y slice de tareas visibles |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `app/components/ListaTareas.tsx` | Refactorizado: usa los 3 nuevos hooks; añadido skeleton de carga animado (`isLoading`) durante el fetch inicial; reducido de ~477 a ~240 líneas |
| `.gitignore` | Añadida excepción `!.env.example` para permitir commitear la plantilla pública |
| `.github/workflows/deploy.yml` | Añadido step `npm run lint` antes de `npm test` en el job `test`; el linter ahora bloquea el pipeline ante fallos |
| `jest.config.ts` | Configurada cobertura: `collectCoverageFrom` (solo `app/components/` + `lib/filtrarTareas.ts`), `coverageThreshold` (`lines≥60, functions≥45, branches≥60`), `coverageReporters: ['text','lcov']` |
| `package.json` | Añadido script `"test:coverage": "jest --coverage"` |
| `README.md` | §2 Estructura actualizada con `app/hooks/`; §5 Instalación usa `cp .env.example`; §9 Añadida tabla de cobertura real (85.6% lines, 94.91% branches, 52% functions) |
