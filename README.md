# TuneBridge

## Estado actual
Este repositorio contiene la primera fase del proyecto `TuneBridge`, una plataforma SaaS escalable para sincronizar playlists y pistas entre múltiples servicios de música.

### Lo que ya está hecho
- Se creó una estructura de monorepo con:
  - `apps/web/` — frontend Next.js 15 + TypeScript + Tailwind CSS
  - `apps/api/` — backend Express + TypeScript
  - `prisma/` — esquema de datos para PostgreSQL
- Se agregó la configuración de turbo para orquestar tareas del monorepo.
- Se definió el esquema Prisma con los modelos `User` y `MatchHistory`.
- Se configuró `.env.example` con variables necesarias para Spotify, JWT, YouTube y PostgreSQL.
- Se implementó backend básico con:
  - `GET /api/auth/login` — redirección a Spotify OAuth
  - `GET /api/auth/callback` — intercambio de código por tokens, persistencia de usuario y generación de JWT
  - `GET /api/spotify/playlists` — lectura de playlists del usuario autenticado
  - `GET /api/spotify/liked-songs` — lectura de pistas guardadas del usuario
  - `GET /api/youtube/search` — búsqueda en YouTube con API key
- Se estructuró el frontend con una página de inicio y un dashboard básico.
- Se implementó un componente cliente en el dashboard para iniciar sesión con Spotify y mostrar playlists usando el token JWT.

## Tareas pendientes
### Inmediatas
- Ejecutar instalación de dependencias y validar el entorno local.
- Ejecutar migración de Prisma para crear el esquema en PostgreSQL.
- Probar el flujo de OAuth de Spotify y la carga de playlists desde el dashboard.
- Corregir/ajustar rutas e importaciones según sea necesario.

### MVP restante
- Añadir lectura completa de `liked songs` y selección de playlists.
- Implementar coincidencias de canciones en YouTube desde el backend.
- Crear tabla de resultados con enlace a Spotify y YouTube.
- Implementar exportación de resultados en CSV, JSON y TXT.
- Agregar manejo de errores y validaciones en frontend y backend.

### Versiones futuras
- Historial de búsquedas y coincidencias guardado en la base de datos.
- Creación de playlists en YouTube.
- Filtros avanzados de búsqueda (oficial, audio, live, etc.).
- Comparación de playlists y detección de duplicados.
- Mejor algoritmo de coincidencia de resultados.

## Cómo seguir avanzando
1. Configurar `.env` con las credenciales reales.
2. Instalar dependencias en la raíz y en cada paquete.
3. Ejecutar `npx prisma migrate dev --name init`.
4. Iniciar la API y el frontend en paralelo.
5. Validar cada endpoint y el flujo de autenticación.
6. Iterar agregando las siguientes funcionalidades del MVP.
