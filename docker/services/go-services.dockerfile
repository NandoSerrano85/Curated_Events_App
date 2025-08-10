# Multi-stage Dockerfile for Go services (API Gateway, User, Event, Search, WebSocket)
# Optimized for production with minimal attack surface

# ============================================================================
# Build Stage
# ============================================================================
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    git \
    ca-certificates \
    tzdata \
    upx

# Create build directory
WORKDIR /build

# Copy go mod files first (better caching)
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build arguments for service configuration
ARG SERVICE_NAME
ARG CGO_ENABLED=0
ARG GOOS=linux
ARG GOARCH=amd64

# Build the application with optimizations
RUN CGO_ENABLED=${CGO_ENABLED} GOOS=${GOOS} GOARCH=${GOARCH} \
    go build -ldflags="-w -s -X main.version=$(git describe --tags --always --dirty) -X main.commit=$(git rev-parse HEAD) -X main.buildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -a -installsuffix cgo \
    -o app \
    ./cmd/${SERVICE_NAME}

# Compress binary (optional, reduces size by ~30%)
RUN upx --best --lzma app || true

# ============================================================================
# Runtime Stage
# ============================================================================
FROM alpine:3.18 AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    curl \
    && update-ca-certificates

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Create app directory
WORKDIR /app

# Copy binary from builder stage
COPY --from=builder --chown=appuser:appgroup /build/app /app/

# Copy configuration files (if any)
COPY --from=builder --chown=appuser:appgroup /build/configs/ /app/configs/

# Create necessary directories
RUN mkdir -p /app/logs /app/tmp && \
    chown -R appuser:appgroup /app/logs /app/tmp

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Default command
ENTRYPOINT ["/app/app"]

# Labels for better organization
LABEL \
    org.opencontainers.image.title="Events Platform Go Service" \
    org.opencontainers.image.description="Go microservice for Events Platform" \
    org.opencontainers.image.vendor="Events Platform" \
    org.opencontainers.image.licenses="MIT"

# ============================================================================
# Development Stage (for local development)
# ============================================================================
FROM golang:1.21-alpine AS development

# Install development tools
RUN apk add --no-cache \
    git \
    curl \
    make \
    gcc \
    musl-dev

# Install air for hot reloading
RUN go install github.com/cosmtrek/air@latest

# Install delve debugger
RUN go install github.com/go-delve/delve/cmd/dlv@latest

# Set working directory
WORKDIR /app

# Copy go.mod and go.sum
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Default command for development
CMD ["air", "-c", ".air.toml"]