#!/usr/bin/env bash
# ==============================================================================
# SIGO-Dental - Script de Despliegue en Servidor Self-Hosted
# ==============================================================================
set -e

echo "🚀 Iniciando despliegue de SIGO-Dental..."

# 1. Verificar Docker
if ! command -v docker > /dev/null 2>&1; then
  echo "❌ Error: Docker no está instalado en este servidor."
  exit 1
fi

# 2. Detectar comando de Docker Compose (V2 plugin o V1 binario)
if docker compose version > /dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose > /dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "❌ Error: Ni 'docker compose' ni 'docker-compose' fueron encontrados."
  exit 1
fi

echo "📦 Utilizando comando: $COMPOSE"

# 3. Preparar archivo de variables de entorno si no existe
if [ ! -f .env ] && [ -f .env.example ]; then
  echo "⚙️ No se encontró archivo .env. Creando uno a partir de .env.example..."
  cp .env.example .env
fi

# 4. Construir y levantar contenedores en segundo plano
echo "🔨 Construyendo imágenes y levantando servicios..."
$COMPOSE up -d --build --remove-orphans

# 5. Esperar a que los servicios inicien y verificar salud
echo "⏳ Esperando inicialización de servicios..."
sleep 5

# Mostrar estado de contenedores
$COMPOSE ps

# 6. Comprobar salud del backend
echo "🩺 Comprobando healthcheck del backend en http://localhost:8080/api/health..."
BACKEND_OK=false
for i in {1..20}; do
  if curl -s http://localhost:8080/api/health | grep -q "ok"; then
    echo "✅ Backend respondiendo correctamente (intento $i)."
    BACKEND_OK=true
    break
  fi
  echo "   Esperando que el backend responda ($i/20)..."
  sleep 3
done

if [ "$BACKEND_OK" = "false" ]; then
  echo "⚠️ Advertencia: El backend demoró en responder. Mostrando logs recientes:"
  $COMPOSE logs --tail 30 backend
fi

# 7. Limpieza de imágenes huérfanas/antiguas para ahorrar espacio en disco
echo "🧹 Limpiando imágenes temporales antiguas..."
docker image prune -f || true

echo "=========================================================="
echo "🎉 ¡Despliegue completado con éxito en el servidor self-hosted!"
echo "   - Frontend: http://localhost"
echo "   - Backend API: http://localhost:8080/api"
echo "   - Monitoreo logs: $COMPOSE logs -f"
echo "=========================================================="
