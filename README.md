# SongBridge

## Estado actual
Este repositorio contiene el prototipo de `SongBridge`, una plataforma de sincronización de playlists entre servicios de música.

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
- Auth OAuth con protección `state`, sesión JWT en cookie `HttpOnly` y tokens de proveedor cifrados:
  - `POST /api/auth/spotify/start`
  - `GET /api/auth/spotify/callback`
  - `POST /api/auth/google/start`
  - `GET /api/auth/google/callback`
  - `GET /api/auth/session`
  - `POST /api/auth/logout`
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
  - sesión segura mediante cookie `HttpOnly`
- Verificado que ambos paquetes compilan con TypeScript:
  - `npx tsc -p apps/api/tsconfig.json --noEmit`
  - `npx tsc -p apps/web/tsconfig.json --noEmit`

## Recomendado ahora
1. Copiar `.env.example` a `.env` y configurar:
   - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
   - `JWT_SECRET`, `JWT_EXPIRES_IN`, `TOKEN_ENCRYPTION_KEY`
   - `DATABASE_URL`
   - `WEB_URL`
2. Instalar dependencias desde la raíz:
   - `npm install`
3. Ejecutar migración de Prisma:
   - `npx prisma migrate dev`
4. Iniciar la API y el frontend:
   - `npm run dev:api`
   - `npm run dev:web`
5. Abrir `http://localhost:3000` y navegar a `/dashboard`.

## Tareas pendientes
- Añadir reintentos y recuperación de sincronizaciones parciales.
- Mejorar los estados de carga y autenticación del frontend.
- Ampliar las pruebas de proveedores y contratos HTTP.
- Pulir la interfaz de usuario y la experiencia de sync.

## Siguientes pasos de MVP
- Añadir una vista del historial guardado en `MatchHistory`.
- Ejecutar sincronizaciones grandes mediante trabajos en segundo plano.
- Permitir revisión manual de coincidencias de baja confianza.
- Agregar soporte para más proveedores en la arquitectura modular.
