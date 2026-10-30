# Multi-stage build para el backend de Go
FROM golang:alpine AS builder

WORKDIR /app

# Copiar dependencias
COPY go.mod go.sum ./
RUN go mod download

# Copiar código fuente
COPY . .

# Compilar para Linux (CGO_ENABLED=0 para binario estático portable con modernc.org/sqlite)
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o sigo-api .

# Imagen final
FROM alpine:latest

WORKDIR /app

# Instalar dependencias necesarias (para SQLite/PostgreSQL)
RUN apk --no-cache add ca-certificates tzdata

# Copiar el binario compilado
COPY --from=builder /app/sigo-api .

# Crear directorio para datos
RUN mkdir -p /app/data

# Exponer puerto
EXPOSE 8080

# Variables de entorno
ENV SIGO_DB=/app/data/sigo.db
ENV SIGO_ADDR=:8080
ENV SIGO_JWT_SECRET=sigo-production-secret-change-me

# Comando
CMD ["./sigo-api"]
