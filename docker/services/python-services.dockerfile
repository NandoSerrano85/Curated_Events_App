# Multi-stage Dockerfile for Python services (Curation, Recommendation, Analytics)
# Optimized for ML/AI workloads with proper dependency management

# ============================================================================
# Base Python Image with System Dependencies
# ============================================================================
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    build-essential \
    curl \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*

# ============================================================================
# Dependencies Stage
# ============================================================================
FROM base AS dependencies

# Install build dependencies for ML libraries
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    gcc \
    g++ \
    gfortran \
    libopenblas-dev \
    liblapack-dev \
    libhdf5-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip and install wheel
RUN pip install --upgrade pip wheel setuptools

# Copy requirements files
COPY requirements.txt requirements-dev.txt* ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install development dependencies if present
RUN if [ -f requirements-dev.txt ]; then pip install --no-cache-dir -r requirements-dev.txt; fi

# ============================================================================
# Runtime Stage
# ============================================================================
FROM base AS runtime

# Install runtime system dependencies
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    libopenblas0 \
    liblapack3 \
    libhdf5-103 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy virtual environment from dependencies stage
COPY --from=dependencies /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=appuser:appgroup . .

# Create necessary directories
RUN mkdir -p /app/logs /app/tmp /app/models /app/data && \
    chown -R appuser:appgroup /app/logs /app/tmp /app/models /app/data

# Switch to non-root user
USER appuser

# Build arguments for service configuration
ARG SERVICE_NAME
ARG SERVICE_PORT=8091

# Expose port
EXPOSE ${SERVICE_PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${SERVICE_PORT}/health || exit 1

# Default command
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8091"]

# Labels
LABEL \
    org.opencontainers.image.title="Events Platform Python Service" \
    org.opencontainers.image.description="Python ML/Analytics service for Events Platform" \
    org.opencontainers.image.vendor="Events Platform" \
    org.opencontainers.image.licenses="MIT"

# ============================================================================
# Development Stage
# ============================================================================
FROM dependencies AS development

# Install additional development tools
RUN pip install \
    black \
    flake8 \
    mypy \
    pytest \
    pytest-asyncio \
    pytest-cov \
    jupyter \
    ipython

# Create development user
RUN groupadd -r devgroup && useradd -r -g devgroup -s /bin/bash devuser

# Set working directory
WORKDIR /app

# Switch to development user
USER devuser

# Default command for development (with hot reloading)
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8091", "--reload"]

# ============================================================================
# Production Stage (smaller, security-hardened)
# ============================================================================
FROM python:3.11-slim AS production

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH"

# Install only runtime system dependencies
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    curl \
    libopenblas0 \
    liblapack3 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge -y --auto-remove

# Create non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup --create-home appuser

# Copy virtual environment
COPY --from=dependencies --chown=appuser:appgroup /opt/venv /opt/venv

# Set working directory
WORKDIR /app

# Copy application code (only what's needed)
COPY --chown=appuser:appgroup main.py ./
COPY --chown=appuser:appgroup app/ ./app/
COPY --chown=appuser:appgroup configs/ ./configs/

# Create necessary directories
RUN mkdir -p /app/logs /app/models && \
    chown -R appuser:appgroup /app/logs /app/models

# Switch to non-root user
USER appuser

# Build arguments
ARG SERVICE_NAME
ARG SERVICE_PORT=8091

# Expose port
EXPOSE ${SERVICE_PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${SERVICE_PORT}/health || exit 1

# Security: Read-only root filesystem (uncomment if needed)
# USER appuser:appgroup
# RUN chmod -R 755 /app

# Default command
CMD ["python", "-m", "gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8091"]

# Labels
LABEL \
    org.opencontainers.image.title="Events Platform Python Service (Production)" \
    org.opencontainers.image.description="Production Python ML service for Events Platform" \
    org.opencontainers.image.vendor="Events Platform" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.source="https://github.com/events-platform/services" \
    maintainer="dev-team@events-platform.com"