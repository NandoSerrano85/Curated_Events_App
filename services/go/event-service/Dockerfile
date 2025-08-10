FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY services/go/event-service/ ./services/go/event-service/

# Build the application
WORKDIR /app/services/go/event-service
RUN CGO_ENABLED=0 GOOS=linux go build -o event-service ./main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

# Copy the binary
COPY --from=builder /app/services/go/event-service/event-service .

# Expose port
EXPOSE 8082

CMD ["./event-service"]