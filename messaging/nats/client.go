package nats

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/nats-io/nats.go"
)

// Event types for the platform
const (
	// User events
	SubjectUserRegistered = "events.user.registered"
	SubjectUserLogin      = "events.user.login"
	SubjectUserUpdated    = "events.user.updated"
	SubjectUserDeleted    = "events.user.deleted"

	// Event events
	SubjectEventCreated   = "events.event.created"
	SubjectEventUpdated   = "events.event.updated"
	SubjectEventDeleted   = "events.event.deleted"
	SubjectEventPublished = "events.event.published"

	// Registration events
	SubjectRegistrationCreated   = "events.registration.created"
	SubjectRegistrationCancelled = "events.registration.cancelled"
	SubjectRegistrationConfirmed = "events.registration.confirmed"

	// Payment events
	SubjectPaymentInitiated = "events.payment.initiated"
	SubjectPaymentCompleted = "events.payment.completed"
	SubjectPaymentFailed    = "events.payment.failed"
	SubjectPaymentRefunded  = "events.payment.refunded"

	// Notification events
	SubjectNotificationSend  = "events.notification.send"
	SubjectNotificationSent  = "events.notification.sent"
	SubjectNotificationFailed = "events.notification.failed"

	// Search events
	SubjectSearchQuery    = "events.search.query"
	SubjectSearchIndexed  = "events.search.indexed"
	SubjectSearchUpdated  = "events.search.updated"

	// WebSocket events
	SubjectWebSocketBroadcast = "events.websocket.broadcast"
	SubjectWebSocketUserJoin  = "events.websocket.user.join"
	SubjectWebSocketUserLeave = "events.websocket.user.leave"

	// System events
	SubjectSystemHealth  = "events.system.health"
	SubjectSystemMetrics = "events.system.metrics"
)

// Message represents a platform message
type Message struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Source    string                 `json:"source"`
	Timestamp time.Time              `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
	Metadata  map[string]string      `json:"metadata,omitempty"`
}

// Client wraps NATS connection and provides platform-specific methods
type Client struct {
	conn           *nats.Conn
	js             nats.JetStreamContext
	subscriptions  map[string]*nats.Subscription
	subscriptionsM sync.RWMutex
	serviceName    string
	logger         *log.Logger
}

// Config holds NATS client configuration
type Config struct {
	URL         string
	ServiceName string
	MaxReconnect int
	ReconnectWait time.Duration
	Timeout      time.Duration
}

// DefaultConfig returns default NATS configuration
func DefaultConfig(serviceName string) *Config {
	return &Config{
		URL:           nats.DefaultURL,
		ServiceName:   serviceName,
		MaxReconnect:  10,
		ReconnectWait: 2 * time.Second,
		Timeout:       5 * time.Second,
	}
}

// NewClient creates a new NATS client
func NewClient(config *Config, logger *log.Logger) (*Client, error) {
	if logger == nil {
		logger = log.Default()
	}

	// Connection options
	opts := []nats.Option{
		nats.Name(config.ServiceName),
		nats.MaxReconnects(config.MaxReconnect),
		nats.ReconnectWait(config.ReconnectWait),
		nats.Timeout(config.Timeout),
		nats.DisconnectErrHandler(func(nc *nats.Conn, err error) {
			if err != nil {
				logger.Printf("NATS disconnected: %v", err)
			}
		}),
		nats.ReconnectHandler(func(nc *nats.Conn) {
			logger.Printf("NATS reconnected to %v", nc.ConnectedUrl())
		}),
		nats.ClosedHandler(func(nc *nats.Conn) {
			logger.Printf("NATS connection closed: %v", nc.LastError())
		}),
	}

	// Connect to NATS
	conn, err := nats.Connect(config.URL, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to NATS: %w", err)
	}

	// Create JetStream context
	js, err := conn.JetStream()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to create JetStream context: %w", err)
	}

	client := &Client{
		conn:          conn,
		js:            js,
		subscriptions: make(map[string]*nats.Subscription),
		serviceName:   config.ServiceName,
		logger:        logger,
	}

	// Setup streams
	if err := client.setupStreams(); err != nil {
		client.Close()
		return nil, fmt.Errorf("failed to setup streams: %w", err)
	}

	logger.Printf("NATS client connected: %s", config.ServiceName)
	return client, nil
}

// setupStreams creates required JetStream streams
func (c *Client) setupStreams() error {
	streams := []struct {
		name     string
		subjects []string
	}{
		{
			name:     "EVENTS",
			subjects: []string{"events.>"},
		},
		{
			name:     "USERS",
			subjects: []string{"users.>"},
		},
		{
			name:     "SYSTEM",
			subjects: []string{"system.>"},
		},
	}

	for _, stream := range streams {
		streamInfo, err := c.js.StreamInfo(stream.name)
		if err != nil && err != nats.ErrStreamNotFound {
			return fmt.Errorf("failed to get stream info for %s: %w", stream.name, err)
		}

		if streamInfo == nil {
			// Create stream
			_, err = c.js.AddStream(&nats.StreamConfig{
				Name:     stream.name,
				Subjects: stream.subjects,
				Storage:  nats.FileStorage,
				MaxAge:   24 * time.Hour, // Retain for 24 hours
				MaxBytes: 100 * 1024 * 1024, // 100MB max
			})
			if err != nil {
				return fmt.Errorf("failed to create stream %s: %w", stream.name, err)
			}
			c.logger.Printf("Created stream: %s", stream.name)
		}
	}

	return nil
}

// Publish publishes a message to a subject
func (c *Client) Publish(subject string, msgType string, data map[string]interface{}) error {
	message := Message{
		ID:        generateID(),
		Type:      msgType,
		Source:    c.serviceName,
		Timestamp: time.Now(),
		Data:      data,
	}

	payload, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return c.conn.Publish(subject, payload)
}

// PublishAsync publishes a message asynchronously with JetStream
func (c *Client) PublishAsync(subject string, msgType string, data map[string]interface{}) (*nats.PubAck, error) {
	message := Message{
		ID:        generateID(),
		Type:      msgType,
		Source:    c.serviceName,
		Timestamp: time.Now(),
		Data:      data,
	}

	payload, err := json.Marshal(message)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal message: %w", err)
	}

	return c.js.Publish(subject, payload)
}

// Subscribe subscribes to a subject with a handler
func (c *Client) Subscribe(subject string, handler func(*Message) error) error {
	c.subscriptionsM.Lock()
	defer c.subscriptionsM.Unlock()

	if _, exists := c.subscriptions[subject]; exists {
		return fmt.Errorf("already subscribed to subject: %s", subject)
	}

	sub, err := c.conn.Subscribe(subject, func(msg *nats.Msg) {
		var message Message
		if err := json.Unmarshal(msg.Data, &message); err != nil {
			c.logger.Printf("Failed to unmarshal message from %s: %v", subject, err)
			return
		}

		if err := handler(&message); err != nil {
			c.logger.Printf("Handler error for subject %s: %v", subject, err)
		}
	})
	if err != nil {
		return fmt.Errorf("failed to subscribe to %s: %w", subject, err)
	}

	c.subscriptions[subject] = sub
	c.logger.Printf("Subscribed to subject: %s", subject)
	return nil
}

// SubscribeDurable creates a durable subscription with JetStream
func (c *Client) SubscribeDurable(subject, durableName string, handler func(*Message) error) error {
	c.subscriptionsM.Lock()
	defer c.subscriptionsM.Unlock()

	key := fmt.Sprintf("%s:%s", subject, durableName)
	if _, exists := c.subscriptions[key]; exists {
		return fmt.Errorf("already subscribed to subject: %s with durable: %s", subject, durableName)
	}

	sub, err := c.js.Subscribe(subject, func(msg *nats.Msg) {
		var message Message
		if err := json.Unmarshal(msg.Data, &message); err != nil {
			c.logger.Printf("Failed to unmarshal message from %s: %v", subject, err)
			msg.Nak()
			return
		}

		if err := handler(&message); err != nil {
			c.logger.Printf("Handler error for subject %s: %v", subject, err)
			msg.Nak()
			return
		}

		msg.Ack()
	}, nats.Durable(durableName), nats.ManualAck())
	if err != nil {
		return fmt.Errorf("failed to create durable subscription for %s: %w", subject, err)
	}

	c.subscriptions[key] = sub
	c.logger.Printf("Created durable subscription: %s -> %s", subject, durableName)
	return nil
}

// Request performs a request-reply operation
func (c *Client) Request(subject string, msgType string, data map[string]interface{}, timeout time.Duration) (*Message, error) {
	message := Message{
		ID:        generateID(),
		Type:      msgType,
		Source:    c.serviceName,
		Timestamp: time.Now(),
		Data:      data,
	}

	payload, err := json.Marshal(message)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal message: %w", err)
	}

	msg, err := c.conn.Request(subject, payload, timeout)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	var response Message
	if err := json.Unmarshal(msg.Data, &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &response, nil
}

// QueueSubscribe creates a queue subscription for load balancing
func (c *Client) QueueSubscribe(subject, queue string, handler func(*Message) error) error {
	c.subscriptionsM.Lock()
	defer c.subscriptionsM.Unlock()

	key := fmt.Sprintf("%s:%s", subject, queue)
	if _, exists := c.subscriptions[key]; exists {
		return fmt.Errorf("already subscribed to subject: %s with queue: %s", subject, queue)
	}

	sub, err := c.conn.QueueSubscribe(subject, queue, func(msg *nats.Msg) {
		var message Message
		if err := json.Unmarshal(msg.Data, &message); err != nil {
			c.logger.Printf("Failed to unmarshal message from %s: %v", subject, err)
			return
		}

		if err := handler(&message); err != nil {
			c.logger.Printf("Handler error for subject %s: %v", subject, err)
		}
	})
	if err != nil {
		return fmt.Errorf("failed to queue subscribe to %s: %w", subject, err)
	}

	c.subscriptions[key] = sub
	c.logger.Printf("Created queue subscription: %s -> %s", subject, queue)
	return nil
}

// Unsubscribe removes a subscription
func (c *Client) Unsubscribe(subject string) error {
	c.subscriptionsM.Lock()
	defer c.subscriptionsM.Unlock()

	sub, exists := c.subscriptions[subject]
	if !exists {
		return fmt.Errorf("not subscribed to subject: %s", subject)
	}

	if err := sub.Unsubscribe(); err != nil {
		return fmt.Errorf("failed to unsubscribe from %s: %w", subject, err)
	}

	delete(c.subscriptions, subject)
	c.logger.Printf("Unsubscribed from subject: %s", subject)
	return nil
}

// Close closes the NATS connection and all subscriptions
func (c *Client) Close() error {
	c.subscriptionsM.Lock()
	defer c.subscriptionsM.Unlock()

	// Close all subscriptions
	for subject, sub := range c.subscriptions {
		if err := sub.Unsubscribe(); err != nil {
			c.logger.Printf("Error unsubscribing from %s: %v", subject, err)
		}
	}

	// Close connection
	c.conn.Close()
	c.logger.Printf("NATS client closed: %s", c.serviceName)
	return nil
}

// Health returns the connection health status
func (c *Client) Health() error {
	if c.conn.IsClosed() {
		return fmt.Errorf("NATS connection is closed")
	}
	if !c.conn.IsConnected() {
		return fmt.Errorf("NATS is not connected")
	}
	return nil
}

// Stats returns connection statistics
func (c *Client) Stats() map[string]interface{} {
	stats := c.conn.Stats()
	return map[string]interface{}{
		"in_msgs":     stats.InMsgs,
		"out_msgs":    stats.OutMsgs,
		"in_bytes":    stats.InBytes,
		"out_bytes":   stats.OutBytes,
		"reconnects":  stats.Reconnects,
		"connected":   c.conn.IsConnected(),
		"servers":     len(c.conn.Servers()),
		"discovered":  len(c.conn.DiscoveredServers()),
	}
}

// generateID generates a unique message ID
func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}