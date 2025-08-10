# Events Platform Deployment Guide

This guide covers deployment strategies, configurations, and best practices for the Events Platform across different environments.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Staging Environment](#staging-environment)
- [Production Deployment](#production-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring & Observability](#monitoring--observability)
- [Security Configuration](#security-configuration)
- [Scaling & Performance](#scaling--performance)
- [Disaster Recovery](#disaster-recovery)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

Events Platform supports multiple deployment strategies:

- **Local Development**: Docker Compose with hot reload
- **Staging**: Docker Compose with production-like configuration
- **Production**: Kubernetes cluster with auto-scaling
- **Hybrid Cloud**: Multi-cloud deployment for high availability

## ✅ Prerequisites

### System Requirements

#### **Development Environment**
- **Docker**: 20.0+ with Docker Compose 2.0+
- **Memory**: 8GB minimum, 16GB recommended
- **CPU**: 4 cores minimum
- **Storage**: 20GB available space

#### **Production Environment**
- **Kubernetes**: 1.25+ cluster
- **Node Requirements**: 4 cores, 8GB RAM per node
- **Storage**: SSD with high IOPS
- **Network**: Load balancer with SSL termination

### Required Tools

```bash
# Install required tools
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Kubernetes CLI
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## 💻 Local Development

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/events-platform.git
cd events-platform

# Set up development environment
cd deployments/compose
make setup
make dev

# Verify deployment
make health
make dev-urls
```

### Development Configuration

#### **Environment Variables** (`.env`)
```bash
# Environment
ENVIRONMENT=development
LOG_LEVEL=debug
DEBUG=true

# Database
POSTGRES_PASSWORD=postgres123
REDIS_PASSWORD=redis123

# Security (development only)
JWT_SECRET=dev-jwt-secret-change-in-production
BCRYPT_COST=10

# Features
FEATURE_HOT_RELOAD=true
FEATURE_DEBUG_ENDPOINTS=true
```

#### **Development Services**

The development environment includes additional tools:

```yaml
# Development tools included
services:
  pgadmin:          # Database management
    ports: ["8090:80"]
  redis-commander:  # Redis management  
    ports: ["8094:8081"]
  kafka-ui:        # Kafka management
    ports: ["8089:8080"]
  elasticsearch-head: # Elasticsearch management
    ports: ["8096:9100"]
  mailhog:         # Email testing
    ports: ["8025:8025"]
```

### Development Workflows

#### **Service Development**
```bash
# Start specific services only
make start-infrastructure  # Databases and queues only
make start-go-services     # Go services only
make start-python-services # Python services only

# Hot reload development
make dev-build SERVICE=api-gateway
make logs-service SERVICE=api-gateway

# Debug specific service
make dev-shell SERVICE=api-gateway
```

#### **Database Management**
```bash
# Run migrations
make db-migrate

# Seed test data
make db-seed

# Database shell
make db-shell

# Backup development data
make db-backup
```

## 🧪 Staging Environment

### Staging Setup

Staging environment mirrors production with some optimizations for testing:

```bash
# Deploy to staging
cd deployments/compose
cp .env.example .env.staging
# Edit .env.staging with staging configuration

# Deploy with staging configuration
ENV_FILE=.env.staging make prod
```

#### **Staging Configuration** (`.env.staging`)
```bash
# Environment
ENVIRONMENT=staging
LOG_LEVEL=info
DEBUG=false

# External URLs
API_BASE_URL=https://api-staging.events-platform.com
WEB_BASE_URL=https://staging.events-platform.com

# Database (staging instance)
POSTGRES_PASSWORD=staging-secure-password
DATABASE_URL=postgres://user:pass@staging-db.com:5432/events_staging

# External Services
SMTP_HOST=smtp.staging-provider.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/staging-webhook

# Features
FEATURE_ANALYTICS_ENABLED=true
FEATURE_ML_MODELS_ENABLED=true
```

### Staging Validation

```bash
# Health checks
curl -f https://api-staging.events-platform.com/health

# Integration tests
make test-integration TARGET=staging

# Load testing
make load-test TARGET=staging USERS=100
```

## 🚀 Production Deployment

### Production Architecture

```
                    ┌─────────────────┐
                    │   CloudFlare    │
                    │  (CDN + WAF)    │
                    └─────────────────┘
                             │
                    ┌─────────────────┐
                    │ Load Balancer   │
                    │   (AWS ALB)     │
                    └─────────────────┘
                             │
        ┌──────────────────────────────────────────┐
        │          Kubernetes Cluster              │
        │  ┌─────────────────────────────────────┐ │
        │  │           Ingress Controller         │ │
        │  └─────────────────────────────────────┘ │
        │                    │                     │
        │  ┌─────────────┐  ┌─────────────┐       │
        │  │ Go Services │  │   Python    │       │
        │  │    Pods     │  │  ML Services│       │
        │  └─────────────┘  └─────────────┘       │
        └──────────────────────────────────────────┘
                             │
    ┌──────────────────────────────────────────────────┐
    │              External Services                   │
    │ ┌──────────┐ ┌──────────┐ ┌─────────────────────┐│
    │ │   RDS    │ │ ElastiCache│ │   Elasticsearch    ││
    │ │(PostgreSQL)│ │ (Redis)  │ │      Service      ││
    │ └──────────┘ └──────────┘ └─────────────────────┘│
    └──────────────────────────────────────────────────┘
```

### Production Prerequisites

#### **Infrastructure Setup**

1. **Kubernetes Cluster**
   ```bash
   # AWS EKS
   eksctl create cluster \
     --name events-platform \
     --region us-west-2 \
     --nodes 3 \
     --node-type m5.xlarge \
     --managed
   
   # Google GKE
   gcloud container clusters create events-platform \
     --zone us-west1-a \
     --num-nodes 3 \
     --machine-type n1-standard-4
   
   # Azure AKS
   az aks create \
     --resource-group events-platform-rg \
     --name events-platform \
     --node-count 3 \
     --node-vm-size Standard_D4s_v3
   ```

2. **External Services**
   ```bash
   # PostgreSQL (managed)
   # AWS RDS, Google Cloud SQL, or Azure Database
   
   # Redis (managed)
   # AWS ElastiCache, Google Memorystore, or Azure Cache
   
   # Elasticsearch (managed)
   # AWS OpenSearch, Elastic Cloud, or self-hosted
   ```

### Production Secrets Management

#### **External Secrets Setup**

```yaml
# External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: events-platform-secrets
  namespace: events-platform
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
  - secretKey: database-url
    remoteRef:
      key: events-platform/database
      property: url
  - secretKey: jwt-secret
    remoteRef:
      key: events-platform/auth
      property: jwt-secret
```

#### **Manual Secrets (Alternative)**

```bash
# Create production secrets
kubectl create namespace events-platform

# Database secrets
kubectl create secret generic postgres-secret \
  --from-literal=password='your-secure-postgres-password' \
  --from-literal=url='postgres://user:pass@prod-db:5432/events_platform' \
  -n events-platform

# Authentication secrets
kubectl create secret generic jwt-secret \
  --from-literal=secret='your-production-jwt-secret-min-32-chars' \
  -n events-platform

# External service secrets
kubectl create secret generic external-secrets \
  --from-literal=smtp-password='smtp-password' \
  --from-literal=slack-webhook='https://hooks.slack.com/your-webhook' \
  -n events-platform
```

### Production Deployment

#### **Using Helm Charts**

1. **Add Helm Repository**
   ```bash
   helm repo add events-platform https://charts.events-platform.com
   helm repo update
   ```

2. **Production Values** (`values-production.yaml`)
   ```yaml
   global:
     environment: production
     domain: events-platform.com
     
   ingress:
     enabled: true
     className: nginx
     annotations:
       cert-manager.io/cluster-issuer: letsencrypt-prod
     tls:
       - secretName: events-platform-tls
         hosts:
           - api.events-platform.com
   
   services:
     apiGateway:
       replicaCount: 3
       resources:
         limits:
           cpu: 1000m
           memory: 1Gi
         requests:
           cpu: 500m
           memory: 512Mi
           
     eventService:
       replicaCount: 3
       resources:
         limits:
           cpu: 1000m
           memory: 1Gi
           
     recommendationEngine:
       replicaCount: 2
       resources:
         limits:
           cpu: 2000m
           memory: 4Gi
         requests:
           cpu: 1000m
           memory: 2Gi
   
   monitoring:
     prometheus:
       enabled: true
     grafana:
       enabled: true
       adminPassword: secure-grafana-password
   ```

3. **Deploy to Production**
   ```bash
   helm upgrade --install events-platform events-platform/events-platform \
     --namespace events-platform \
     --create-namespace \
     --values values-production.yaml \
     --timeout 10m
   ```

#### **Using Raw Manifests**

```bash
# Apply all Kubernetes manifests
kubectl apply -f deployments/kubernetes/namespace.yaml
kubectl apply -f deployments/kubernetes/secrets.yaml
kubectl apply -f deployments/kubernetes/configmaps/
kubectl apply -f deployments/kubernetes/services/
kubectl apply -f deployments/kubernetes/deployments/
kubectl apply -f deployments/kubernetes/ingress.yaml

# Verify deployment
kubectl get pods -n events-platform
kubectl get services -n events-platform
```

### Production Configuration

#### **Resource Limits**
```yaml
# Production resource configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api-gateway
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        env:
        - name: GOMAXPROCS
          value: "1"  # Match CPU limit
```

#### **Production Environment Variables**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: events-platform-config
data:
  ENVIRONMENT: "production"
  LOG_LEVEL: "warn"
  DEBUG: "false"
  
  # Performance settings
  API_TIMEOUT: "30s"
  DB_MAX_CONNECTIONS: "25"
  DB_MAX_IDLE: "10"
  
  # Feature flags
  FEATURE_ANALYTICS_ENABLED: "true"
  FEATURE_ML_ENABLED: "true"
  FEATURE_REAL_TIME_ENABLED: "true"
```

## ☸️ Kubernetes Deployment

### Cluster Setup

#### **Production-Ready Cluster Configuration**

```yaml
# cluster-config.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: events-platform-prod
  region: us-west-2
  version: "1.27"

vpc:
  cidr: "10.0.0.0/16"
  nat:
    gateway: Single

nodeGroups:
  - name: system-nodes
    instanceType: m5.large
    minSize: 2
    maxSize: 4
    desiredCapacity: 2
    labels:
      role: system
    taints:
      - key: system
        value: "true"
        effect: NoSchedule
        
  - name: application-nodes
    instanceType: m5.xlarge
    minSize: 3
    maxSize: 10
    desiredCapacity: 3
    labels:
      role: application
      
  - name: ml-nodes
    instanceType: m5.2xlarge
    minSize: 1
    maxSize: 5
    desiredCapacity: 2
    labels:
      role: ml-workloads

addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy
  - name: aws-ebs-csi-driver
```

#### **Deploy Cluster**
```bash
eksctl create cluster -f cluster-config.yaml

# Install additional components
helm install ingress-nginx ingress-nginx/ingress-nginx
helm install cert-manager jetstack/cert-manager --set installCRDs=true
helm install prometheus prometheus-community/kube-prometheus-stack
```

### Service Deployment

#### **Go Services Deployment**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: events-platform
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v1
    spec:
      nodeSelector:
        role: application
      containers:
      - name: api-gateway
        image: events-platform/api-gateway:v1.0.0
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: PORT
          value: "8080"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: url
        envFrom:
        - configMapRef:
            name: events-platform-config
        resources:
          requests:
            memory: 512Mi
            cpu: 500m
          limits:
            memory: 1Gi
            cpu: 1000m
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
```

#### **Python ML Services Deployment**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: recommendation-engine
  namespace: events-platform
spec:
  replicas: 2
  template:
    spec:
      nodeSelector:
        role: ml-workloads
      containers:
      - name: recommendation-engine
        image: events-platform/recommendation-engine:v1.0.0
        ports:
        - containerPort: 8092
        resources:
          requests:
            memory: 2Gi
            cpu: 1000m
          limits:
            memory: 4Gi
            cpu: 2000m
        readinessProbe:
          httpGet:
            path: /health
            port: 8092
          initialDelaySeconds: 30  # ML models take longer to load
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 8092
          initialDelaySeconds: 60
          periodSeconds: 30
```

### Auto-Scaling Configuration

#### **Horizontal Pod Autoscaler**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: events-platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

#### **Vertical Pod Autoscaler**
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: recommendation-engine-vpa
  namespace: events-platform
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: recommendation-engine
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: recommendation-engine
      minAllowed:
        cpu: 500m
        memory: 1Gi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
```

### Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: events-platform-ingress
  namespace: events-platform
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  tls:
  - hosts:
    - api.events-platform.com
    - ws.events-platform.com
    secretName: events-platform-tls
  rules:
  - host: api.events-platform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 8080
  - host: ws.events-platform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: websocket-gateway
            port:
              number: 8084
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

#### **Build and Test Pipeline**
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: events-platform

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: events_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Go
      uses: actions/setup-go@v4
      with:
        go-version: '1.21'
        
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Run Go tests
      run: |
        cd services/go
        go mod download
        go test ./... -race -coverprofile=coverage.out
        
    - name: Run Python tests
      run: |
        cd services/python
        pip install -r requirements.txt
        pytest --cov=. --cov-report=xml
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      
  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    strategy:
      matrix:
        service: 
          - api-gateway
          - user-service
          - event-service
          - search-service
          - websocket-gateway
          - curation-service
          - recommendation-engine
          - analytics-service
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
      
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
        
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.service }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix=main-,suffix=-{{date 'YYYYMMDD'}},enable={{is_default_branch}}
          type=raw,value=latest,enable={{is_default_branch}}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        file: docker/services/go-services.dockerfile  # or python-services.dockerfile
        build-args: |
          SERVICE_NAME=${{ matrix.service }}
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-west-2
        
    - name: Update kubeconfig
      run: aws eks update-kubeconfig --name events-platform-prod
      
    - name: Deploy to Kubernetes
      run: |
        # Update image tags in manifests
        sed -i "s|events-platform/api-gateway:.*|events-platform/api-gateway:main-${GITHUB_SHA:0:7}-$(date +%Y%m%d)|g" deployments/kubernetes/deployments/api-gateway.yaml
        
        # Apply manifests
        kubectl apply -f deployments/kubernetes/
        
        # Wait for rollout
        kubectl rollout status deployment/api-gateway -n events-platform --timeout=300s
        kubectl rollout status deployment/event-service -n events-platform --timeout=300s
        
    - name: Run smoke tests
      run: |
        # Wait for services to be ready
        kubectl wait --for=condition=ready pod -l app=api-gateway -n events-platform --timeout=300s
        
        # Run smoke tests
        API_URL=$(kubectl get ingress events-platform-ingress -n events-platform -o jsonpath='{.spec.rules[0].host}')
        curl -f https://$API_URL/health || exit 1
```

### ArgoCD GitOps Deployment

#### **Application Configuration**
```yaml
# argocd/events-platform-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: events-platform
  namespace: argocd
spec:
  project: default
  
  source:
    repoURL: https://github.com/your-org/events-platform.git
    targetRevision: HEAD
    path: deployments/kubernetes
    
  destination:
    server: https://kubernetes.default.svc
    namespace: events-platform
    
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    - PruneLast=true
    
  revisionHistoryLimit: 10
  
  ignoreDifferences:
  - group: apps
    kind: Deployment
    managedFieldsManagers:
    - kube-controller-manager
```

## 📊 Monitoring & Observability

### Prometheus Configuration

```yaml
# monitoring/prometheus/production-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
      external_labels:
        cluster: events-platform-prod
        environment: production
        
    rule_files:
      - "/etc/prometheus/rules/*.yml"
      
    scrape_configs:
      - job_name: kubernetes-apiservers
        kubernetes_sd_configs:
        - role: endpoints
        scheme: https
        tls_config:
          ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
        relabel_configs:
        - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
          action: keep
          regex: default;kubernetes;https
          
      - job_name: events-platform-services
        kubernetes_sd_configs:
        - role: pod
        relabel_configs:
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
          action: keep
          regex: true
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
          action: replace
          target_label: __metrics_path__
          regex: (.+)
```

### Grafana Dashboards

```bash
# Deploy monitoring stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values monitoring/helm/prometheus-values.yaml

# Install Grafana
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set adminPassword=secure-grafana-password \
  --values monitoring/helm/grafana-values.yaml
```

## 🔐 Security Configuration

### Network Policies

```yaml
# Network policy for Events Platform
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: events-platform-netpol
  namespace: events-platform
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  - from:
    - podSelector:
        matchLabels:
          app: websocket-gateway
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: user-service
    ports:
    - protocol: TCP
      port: 8081
  - to:
    - podSelector:
        matchLabels:
          app: event-service
    ports:
    - protocol: TCP
      port: 8082
```

### Pod Security Standards

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: events-platform
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Security Context

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: api-gateway
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: var-cache
          mountPath: /var/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: var-cache
        emptyDir: {}
```

## ⚖️ Scaling & Performance

### Resource Planning

#### **Service Resource Requirements**

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas (Min/Max) |
|---------|-------------|-----------|----------------|--------------|-------------------|
| API Gateway | 500m | 1000m | 512Mi | 1Gi | 3/10 |
| User Service | 250m | 500m | 256Mi | 512Mi | 2/5 |
| Event Service | 500m | 1000m | 512Mi | 1Gi | 3/8 |
| Search Service | 500m | 1000m | 512Mi | 1Gi | 2/5 |
| WebSocket Gateway | 250m | 500m | 256Mi | 512Mi | 2/5 |
| Curation Service | 1000m | 2000m | 2Gi | 4Gi | 1/3 |
| Recommendation Engine | 1000m | 2000m | 2Gi | 4Gi | 2/5 |
| Analytics Service | 1000m | 2000m | 1.5Gi | 3Gi | 2/4 |

### Performance Optimization

#### **JVM Tuning** (if using JVM-based services)
```yaml
env:
- name: JAVA_OPTS
  value: >-
    -XX:+UseG1GC
    -XX:MaxGCPauseMillis=200
    -XX:+UseContainerSupport
    -XX:MaxRAMPercentage=75.0
    -XX:+ExitOnOutOfMemoryError
    -XX:+HeapDumpOnOutOfMemoryError
    -XX:HeapDumpPath=/tmp/heapdump.hprof
```

#### **Go Service Optimization**
```yaml
env:
- name: GOMAXPROCS
  value: "1"  # Match CPU limit
- name: GOGC
  value: "100"  # Default GC target percentage
- name: GOMEMLIMIT
  value: "900MiB"  # Leave headroom under memory limit
```

#### **Python Service Optimization**
```yaml
env:
- name: PYTHONUNBUFFERED
  value: "1"
- name: MALLOC_ARENA_MAX
  value: "2"  # Reduce memory fragmentation
- name: WORKERS
  value: "4"  # Match CPU cores
- name: WORKER_CONNECTIONS
  value: "1000"
```

### Database Scaling

#### **Connection Pool Configuration**
```yaml
env:
- name: DB_MAX_CONNECTIONS
  value: "25"  # Total connections per pod
- name: DB_MAX_IDLE
  value: "10"   # Idle connections to keep
- name: DB_CONN_MAX_LIFETIME
  value: "300s" # Connection lifetime
```

#### **Read Replicas**
```yaml
# Database read replica configuration
env:
- name: DATABASE_READ_URL
  value: "postgres://user:pass@read-replica:5432/events_platform"
- name: DATABASE_WRITE_URL
  value: "postgres://user:pass@primary:5432/events_platform"
- name: READ_WRITE_SPLIT
  value: "true"
```

## 💾 Disaster Recovery

### Backup Strategy

#### **Database Backups**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: events-platform
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15
            command:
            - /bin/bash
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              BACKUP_FILE="postgres_backup_$TIMESTAMP.sql.gz"
              
              pg_dump $DATABASE_URL | gzip > /tmp/$BACKUP_FILE
              
              # Upload to S3
              aws s3 cp /tmp/$BACKUP_FILE s3://events-platform-backups/postgres/$BACKUP_FILE
              
              # Cleanup old backups (keep last 30 days)
              aws s3 ls s3://events-platform-backups/postgres/ | \
                head -n -30 | \
                awk '{print $4}' | \
                xargs -I {} aws s3 rm s3://events-platform-backups/postgres/{}
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: url
            - name: AWS_DEFAULT_REGION
              value: us-west-2
          restartPolicy: OnFailure
```

#### **Application Data Backup**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-script
data:
  backup.sh: |
    #!/bin/bash
    set -e
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="/backups/$TIMESTAMP"
    
    mkdir -p $BACKUP_DIR
    
    # Database backup
    pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/postgres.sql.gz
    
    # Redis backup
    redis-cli --rdb $BACKUP_DIR/redis.rdb
    
    # Application configs
    kubectl get configmap -n events-platform -o yaml > $BACKUP_DIR/configmaps.yaml
    kubectl get secret -n events-platform -o yaml > $BACKUP_DIR/secrets.yaml
    
    # Upload to S3
    tar czf - $BACKUP_DIR | aws s3 cp - s3://events-platform-backups/full/$TIMESTAMP.tar.gz
    
    # Cleanup local backup
    rm -rf $BACKUP_DIR
```

### Disaster Recovery Plan

#### **RTO/RPO Targets**
- **RTO (Recovery Time Objective)**: 30 minutes
- **RPO (Recovery Point Objective)**: 1 hour
- **Availability Target**: 99.9% (8.76 hours downtime/year)

#### **Recovery Procedures**

1. **Database Recovery**
   ```bash
   # Restore from latest backup
   LATEST_BACKUP=$(aws s3 ls s3://events-platform-backups/postgres/ | sort | tail -n 1 | awk '{print $4}')
   aws s3 cp s3://events-platform-backups/postgres/$LATEST_BACKUP /tmp/
   gunzip -c /tmp/$LATEST_BACKUP | psql $DATABASE_URL
   ```

2. **Application Recovery**
   ```bash
   # Redeploy services
   kubectl rollout restart deployment -n events-platform
   
   # Verify health
   kubectl get pods -n events-platform
   kubectl logs -f deployment/api-gateway -n events-platform
   ```

3. **Data Verification**
   ```bash
   # Verify data integrity
   kubectl exec -it deployment/api-gateway -n events-platform -- \
     curl -f http://localhost:8080/health/database
   ```

## 🔧 Troubleshooting

### Common Issues

#### **Service Won't Start**
```bash
# Check pod status
kubectl get pods -n events-platform

# Check pod logs
kubectl logs deployment/api-gateway -n events-platform --tail=100

# Check events
kubectl get events -n events-platform --sort-by='.lastTimestamp'

# Check resource constraints
kubectl describe pod -l app=api-gateway -n events-platform
```

#### **High Memory Usage**
```bash
# Check memory usage
kubectl top pods -n events-platform

# Check for memory leaks
kubectl exec -it deployment/api-gateway -n events-platform -- \
  curl http://localhost:8080/debug/pprof/heap > heap.pprof

# Analyze with pprof
go tool pprof heap.pprof
```

#### **Database Connection Issues**
```bash
# Test database connectivity
kubectl exec -it deployment/api-gateway -n events-platform -- \
  pg_isready -h postgres -p 5432

# Check connection pool stats
kubectl exec -it deployment/api-gateway -n events-platform -- \
  curl http://localhost:8080/debug/vars | jq '.db'
```

#### **Message Queue Issues**
```bash
# Check NATS connectivity
kubectl exec -it deployment/api-gateway -n events-platform -- \
  nats server info

# Check Kafka topics
kubectl exec -it kafka-0 -n events-platform -- \
  kafka-topics.sh --bootstrap-server localhost:9092 --list
```

### Performance Troubleshooting

#### **Slow API Responses**
```bash
# Check response times
kubectl exec -it deployment/api-gateway -n events-platform -- \
  curl -w "@curl-format.txt" -s -o /dev/null http://localhost:8080/health

# Check database query performance
kubectl exec -it postgres-0 -n events-platform -- \
  psql -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

#### **High CPU Usage**
```bash
# Get CPU profiling data
kubectl exec -it deployment/api-gateway -n events-platform -- \
  curl http://localhost:8080/debug/pprof/profile?seconds=30 > cpu.pprof

# Analyze
go tool pprof cpu.pprof
```

### Monitoring Alerts

#### **Critical Alerts Response**
1. **Service Down**
   - Check pod status and logs
   - Verify resource availability
   - Check dependencies (database, cache)
   - Restart service if needed

2. **High Error Rate**
   - Check application logs
   - Verify database connectivity
   - Check external service dependencies
   - Review recent deployments

3. **Resource Exhaustion**
   - Check resource utilization
   - Scale services if needed
   - Investigate memory leaks
   - Review resource limits

This deployment guide provides comprehensive coverage for deploying Events Platform across different environments with proper security, monitoring, and disaster recovery procedures.