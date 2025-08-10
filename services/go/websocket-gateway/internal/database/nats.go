package database

import (
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

// WebSocket-specific NATS subjects
const (
	// WebSocket events
	WSConnectionSubject    = "ws.connection"
	WSDisconnectionSubject = "ws.disconnection"
	WSRoomJoinSubject      = "ws.room.join"
	WSRoomLeaveSubject     = "ws.room.leave"
	WSMessageSubject       = "ws.message"
	
	// Event-related subjects for WebSocket notifications
	EventUpdateWSSubject       = "ws.event.update"
	EventRegistrationWSSubject = "ws.event.registration"
	EventReminderWSSubject     = "ws.event.reminder"
	EventLiveWSSubject         = "ws.event.live"
	
	// Chat subjects
	ChatMessageSubject = "ws.chat.message"
	ChatTypingSubject  = "ws.chat.typing"
	
	// Live features
	LiveLocationSubject   = "ws.live.location"
	LiveAttendanceSubject = "ws.live.attendance"
	LivePollSubject       = "ws.live.poll"
	LiveQnASubject        = "ws.live.qna"
	
	// System notifications
	NotificationSubject = "ws.notification"
	
	// Broadcast subjects (for sending to multiple WebSocket instances)
	BroadcastToUserSubject = "ws.broadcast.user."    // + userID
	BroadcastToRoomSubject = "ws.broadcast.room."    // + roomID
	BroadcastGlobalSubject = "ws.broadcast.global"
)