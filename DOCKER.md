# Docker - SIGO Dental

Este proyecto incluye configuración completa de Docker para despliegue en producción y desarrollo.

## Estructura

- `server/Dockerfile` - Build del backend Go
- `web/Dockerfile` - Build del frontend React con nginx
- `web/nginx.conf` - Configuración de nginx
- `docker-compose.yml` - Orquestación completa con PostgreSQL
- `docker-compose.dev.yml` - Versión de desarrollo con SQLite

## Requisitos previos

- Docker Desktop instalado
- Docker Compose v2

## Despliegue en producción (con PostgreSQL)

```bash
# Levantar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (cuidado: borra datos)
docker-compose down -v
```

La aplicación estará disponible en:
- Frontend: http://localhost
- Backend API: http://localhost:8080
- PostgreSQL: localhost:5432

## Despliegue en desarrollo (con SQLite)

```bash
# Levantar con SQLite (sin PostgreSQL)
docker-compose -f docker-compose.dev.yml up -d

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f

# Detener servicios
docker-compose -f docker-compose.dev.yml down
```

## Variables de entorno

### Backend
- `SIGO_DB` - Cadena de conexión a base de datos (SQLite o PostgreSQL)
- `SIGO_ADDR` - Dirección de escucha (default: `:8080`)
- `SIGO_JWT_SECRET` - Secreto para tokens JWT (cambiar en producción)

### PostgreSQL (docker-compose.yml)
- `POSTGRES_DB` - Nombre de base de datos (default: `sigo_dental`)
- `POSTGRES_USER` - Usuario (default: `sigo`)
- `POSTGRES_PASSWORD` - Contraseña (cambiar en producción)

## Volumenes persistentes

- `postgres_data` - Datos de PostgreSQL
- `backend_data` - Datos de SQLite (si se usa) y archivos del backend

## Construcción manual de imágenes

```bash
# Backend
cd server
docker build -t sigo-backend:latest .

# Frontend
cd web
docker build -t sigo-frontend:latest .
```

## Cambiar entre SQLite y PostgreSQL

### SQLite (default en desarrollo)
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### PostgreSQL (recomendado para producción)
```bash
docker-compose up -d
```

## Solución de problemas

### El contenedor de PostgreSQL no inicia
```bash
# Ver logs
docker-compose logs postgres

# Recrear volumen
docker-compose down -v
docker-compose up -d
```

### El backend no se conecta a PostgreSQL
```bash
# Verificar que PostgreSQL esté listo
docker-compose exec postgres pg_isready -U sigo

# Ver logs del backend
docker-compose logs backend
```

### Rebuild después de cambios
```bash
# Reconstruir imágenes
docker-compose up -d --build

# Solo backend
docker-compose up -d --build backend

# Solo frontend
docker-compose up -d --build frontend
```

## Seguridad para producción

1. Cambiar `SIGO_JWT_SECRET` a un valor seguro
2. Cambiar `POSTGRES_PASSWORD` a una contraseña fuerte
3. Usar HTTPS en producción (configurar nginx con SSL)
4. Configurar firewall para exponer solo puertos necesarios
5. Implementar backups regulares de PostgreSQL

## Backups

### Backup de PostgreSQL
```bash
docker-compose exec postgres pg_dump -U sigo sigo_dental > backup.sql
```

### Restore de PostgreSQL
```bash
cat backup.sql | docker-compose exec -T postgres psql -U sigo sigo_dental
```

### Backup de SQLite
```bash
docker-compose cp backend:/app/data/sigo.db ./backup.db
```

## Escalado

Para escalar el backend (requiere balanceador de carga adicional):
```bash
docker-compose up -d --scale backend=3
```

Nota: Esto requiere configuración adicional de balanceador de carga y almacenamiento compartido.
