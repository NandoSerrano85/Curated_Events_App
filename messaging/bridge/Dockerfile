# Dockerfile for NATS-Kafka Bridge Service

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy bridge application
COPY bridge.py .
COPY __init__.py .

# Create log directory
RUN mkdir -p /var/log/bridge

# Create non-root user
RUN useradd --create-home --shell /bin/bash bridge
RUN chown -R bridge:bridge /app /var/log/bridge
USER bridge

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import asyncio; from bridge import BridgeService; print('OK')"

# Run the bridge service
CMD ["python", "bridge.py"]