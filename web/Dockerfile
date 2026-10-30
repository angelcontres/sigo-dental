# Multi-stage build para el frontend React
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar para producción
RUN npm run build

# Imagen final con nginx
FROM nginx:alpine

# Copiar el build de producción
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto
EXPOSE 80

# Comando
CMD ["nginx", "-g", "daemon off;"]
