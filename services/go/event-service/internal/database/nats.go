package database

import (
	"encoding/json"
	"time"

	"github.com/nats-io/nats.go"
)

func ConnectNATS(urls []string) (*nats.Conn, error) {
	opts := []nats.Option{
		nats.ReconnectWait(time.Second * 2),
		nats.MaxReconnects(-1),
		nats.DisconnectErrHandler(func(nc *nats.Conn, err error) {
			// Log disconnection
		}),
		nats.ReconnectHandler(func(nc *nats.Conn) {
			// Log reconnection
		}),
	}
	
	nc, err := nats.Connect(nats.DefaultURL, opts...)
	if err != nil {
		return nil, err
	}
	
	return nc, nil
}

// NATS subjects
const (
	EventCreatedSubject        = "event.created"
	EventUpdatedSubject        = "event.updated"
	EventDeletedSubject        = "event.deleted"
	EventPublishedSubject      = "event.published"
	EventRegistrationSubject   = "event.registration.created"
	EventUnregistrationSubject = "event.registration.cancelled"
	EventCapacityUpdatedSubject = "event.capacity.updated"
	PaymentCompletedSubject    = "payment.completed"
)

// Event messages
type EventCreatedMessage struct {
	EventID     string                 `json:"event_id"`
	OrganizerID string                 `json:"organizer_id"`
	Event       map[string]interface{} `json:"event"`
	Timestamp   time.Time              `json:"timestamp"`
}

type EventRegistrationMessage struct {
	EventID        string    `json:"event_id"`
	UserID         string    `json:"user_id"`
	RegistrationID string    `json:"registration_id"`
	Status         string    `json:"status"`
	PaymentID      *string   `json:"payment_id,omitempty"`
	Timestamp      time.Time `json:"timestamp"`
}

type EventCapacityMessage struct {
	EventID         string `json:"event_id"`
	CurrentCapacity int    `json:"current_capacity"`
	MaxCapacity     *int   `json:"max_capacity"`
	Timestamp       time.Time `json:"timestamp"`
}

func PublishMessage(nc *nats.Conn, subject string, data interface{}) error {
	msgData, err := json.Marshal(data)
	if err != nil {
		return err
	}
	
	return nc.Publish(subject, msgData)
}