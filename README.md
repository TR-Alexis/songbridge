# TuneBridge

## Estado actual
Este repositorio contiene el prototipo de `TuneBridge`, una plataforma de sincronización de playlists entre servicios de música.

### Lo que ya está hecho
- Estructura de monorepo con:
  - `apps/web/` — frontend Next.js 15 + TypeScript + Tailwind CSS
  - `apps/api/` — backend Express + TypeScript + Prisma
  - `prisma/` — esquema de datos para PostgreSQL
- Configuración de `turbo` para orquestar tareas del monorepo.
- Definición de `prisma/schema.prisma` con modelos `User`, `ProviderAccount` y `MatchHistory`.
- Arquitectura modular de proveedores con:
  - `apps/api/src/modules/spotify`
  - `apps/api/src/modules/youtube`
  - Modelo común `Track` en `apps/api/src/core/types/track.ts`
- Auth OAuth y JWT:
  - `GET /api/auth/spotify/login`
  - `GET /api/auth/spotify/callback`
  - `GET /api/auth/google/login`
  - `GET /api/auth/google/callback`
- Rutas de API existentes:
  - `GET /api/spotify/playlists`
  - `GET /api/spotify/liked-songs`
  - `GET /api/youtube/playlists`
  - `GET /api/youtube/search`
  - `POST /api/sync/spotify-to-youtube`
  - `POST /api/sync/youtube-to-spotify`
- Frontend del dashboard con:
  - botones de conexión Spotify / YouTube
  - selección de playlist de Spotify y YouTube
  - acciones de sincronización desde Spotify a YouTube y viceversa
  - manejo de token JWT en `localStorage`
- Verificado que ambos paquetes compilan con TypeScript:
  - `npx tsc -p apps/api/tsconfig.json --noEmit`
  - `npx tsc -p apps/web/tsconfig.json --noEmit`

## Recomendado ahora
1. Copiar `.env.example` a `.env` y configurar:
   - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
   - `JWT_SECRET`, `JWT_EXPIRES_IN`
   - `DATABASE_URL`
   - `WEB_URL`
2. Instalar dependencias desde la raíz:
   - `npm install`
3. Ejecutar migración de Prisma:
   - `npx prisma migrate dev --name init`
4. Iniciar la API y el frontend:
   - `npm run dev:api`
   - `npm run dev:web`
5. Abrir `http://localhost:3000` y navegar a `/dashboard`.

## Tareas pendientes
- Completar el flujo de creación y carga de playlists de YouTube.
- Afinar el motor de coincidencia y guardar resultados en la base de datos.
- Mejorar manejo de errores y estados de autenticación en frontend.
- Añadir pruebas y validaciones de contractos API.
- Pulir la interfaz de usuario y la experiencia de sync.

## Siguientes pasos de MVP
- Crear playlists destino en YouTube y Spotify desde el sync.
- Persistir historial de sincronizaciones en `MatchHistory`.
- Añadir filtros y mejor lógica de emparejamiento por título/artista.
- Agregar soporte para más proveedores en la arquitectura modular.
