FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY services/go/api-gateway/ ./services/go/api-gateway/

# Build the application
WORKDIR /app/services/go/api-gateway
RUN CGO_ENABLED=0 GOOS=linux go build -o api-gateway ./main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

# Copy the binary
COPY --from=builder /app/services/go/api-gateway/api-gateway .

# Expose port
EXPOSE 8080

CMD ["./api-gateway"]