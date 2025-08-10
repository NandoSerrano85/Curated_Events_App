package models

import (
	"time"

	"github.com/google/uuid"
)

type Connection struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	UserName    string    `json:"user_name"`
	UserEmail   string    `json:"user_email"`
	IPAddress   string    `json:"ip_address"`
	UserAgent   string    `json:"user_agent"`
	ConnectedAt time.Time `json:"connected_at"`
	LastPing    time.Time `json:"last_ping"`
	Rooms       []string  `json:"rooms"`
}

type Message struct {
	ID        uuid.UUID              `json:"id"`
	Type      MessageType            `json:"type"`
	From      uuid.UUID              `json:"from,omitempty"`
	To        *uuid.UUID             `json:"to,omitempty"`
	Room      *string                `json:"room,omitempty"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
}

type MessageType string

const (
	// System messages
	MessageTypeConnect    MessageType = "connect"
	MessageTypeDisconnect MessageType = "disconnect"
	MessageTypePing       MessageType = "ping"
	MessageTypePong       MessageType = "pong"
	MessageTypeError      MessageType = "error"
	
	// Room management
	MessageTypeJoinRoom    MessageType = "join_room"
	MessageTypeLeaveRoom   MessageType = "leave_room"
	MessageTypeRoomMessage MessageType = "room_message"
	MessageTypeRoomUpdate  MessageType = "room_update"
	
	// Event-related messages
	MessageTypeEventUpdate        MessageType = "event_update"
	MessageTypeEventRegistration  MessageType = "event_registration"
	MessageTypeEventCancellation  MessageType = "event_cancellation"
	MessageTypeEventReminder      MessageType = "event_reminder"
	MessageTypeEventLiveUpdate    MessageType = "event_live_update"
	
	// Chat messages
	MessageTypeChat         MessageType = "chat"
	MessageTypeChatMessage  MessageType = "chat_message"
	MessageTypeTyping       MessageType = "typing"
	MessageTypeStopTyping   MessageType = "stop_typing"
	
	// Notifications
	MessageTypeNotification MessageType = "notification"
	
	// Live features
	MessageTypeLiveLocation    MessageType = "live_location"
	MessageTypeLiveAttendance  MessageType = "live_attendance"
	MessageTypeLivePolls       MessageType = "live_polls"
	MessageTypeLiveQ&A         MessageType = "live_qna"
)

type Room struct {
	ID          string    `json:"id"`
	Type        RoomType  `json:"type"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	EventID     *uuid.UUID `json:"event_id,omitempty"`
	CreatedBy   uuid.UUID `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	MaxSize     int       `json:"max_size"`
	IsPrivate   bool      `json:"is_private"`
	Settings    RoomSettings `json:"settings"`
	
	// Runtime data
	ConnectionCount int       `json:"connection_count"`
	LastActivity    time.Time `json:"last_activity"`
}

type RoomType string

const (
	RoomTypeGeneral     RoomType = "general"
	RoomTypeEvent       RoomType = "event"
	RoomTypeEventLive   RoomType = "event_live"
	RoomTypePrivateChat RoomType = "private_chat"
	RoomTypeGroupChat   RoomType = "group_chat"
	RoomTypeSupport     RoomType = "support"
)

type RoomSettings struct {
	AllowChat        bool `json:"allow_chat"`
	AllowAnonymous   bool `json:"allow_anonymous"`
	RequireApproval  bool `json:"require_approval"`
	ModerationEnabled bool `json:"moderation_enabled"`
	RateLimitMessages int  `json:"rate_limit_messages"`
}

type JoinRoomRequest struct {
	RoomID   string `json:"room_id" binding:"required"`
	Password string `json:"password,omitempty"`
}

type LeaveRoomRequest struct {
	RoomID string `json:"room_id" binding:"required"`
}

type RoomMessageRequest struct {
	RoomID  string                 `json:"room_id" binding:"required"`
	Type    string                 `json:"type"`
	Content map[string]interface{} `json:"content"`
}

type ChatMessageRequest struct {
	RoomID  string `json:"room_id" binding:"required"`
	Message string `json:"message" binding:"required"`
}

type PrivateMessageRequest struct {
	ToUserID uuid.UUID `json:"to_user_id" binding:"required"`
	Message  string    `json:"message" binding:"required"`
}

type TypingRequest struct {
	RoomID string `json:"room_id" binding:"required"`
	Typing bool   `json:"typing"`
}

type LiveLocationUpdate struct {
	EventID   uuid.UUID `json:"event_id" binding:"required"`
	Latitude  float64   `json:"latitude" binding:"required"`
	Longitude float64   `json:"longitude" binding:"required"`
	Accuracy  *float64  `json:"accuracy,omitempty"`
}

type LiveAttendanceUpdate struct {
	EventID    uuid.UUID `json:"event_id" binding:"required"`
	Status     string    `json:"status"` // "checked_in", "checked_out"
	Location   *GeoPoint `json:"location,omitempty"`
}

type GeoPoint struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type PollUpdate struct {
	EventID  uuid.UUID              `json:"event_id" binding:"required"`
	PollID   uuid.UUID              `json:"poll_id" binding:"required"`
	Action   string                 `json:"action"` // "vote", "create", "close"
	Data     map[string]interface{} `json:"data"`
}

type QnAUpdate struct {
	EventID    uuid.UUID              `json:"event_id" binding:"required"`
	QuestionID *uuid.UUID             `json:"question_id,omitempty"`
	Action     string                 `json:"action"` // "ask", "answer", "vote"
	Data       map[string]interface{} `json:"data"`
}

type ConnectionStats struct {
	TotalConnections    int               `json:"total_connections"`
	ConnectionsByRoom   map[string]int    `json:"connections_by_room"`
	ConnectionsByUser   map[string]int    `json:"connections_by_user"`
	MessagesSent        int64             `json:"messages_sent"`
	MessagesReceived    int64             `json:"messages_received"`
	ActiveRooms         int               `json:"active_rooms"`
	AverageLatency      time.Duration     `json:"average_latency"`
	Uptime             time.Duration     `json:"uptime"`
}

type RoomStats struct {
	RoomID           string        `json:"room_id"`
	ConnectionCount  int           `json:"connection_count"`
	MessageCount     int64         `json:"message_count"`
	CreatedAt        time.Time     `json:"created_at"`
	LastActivity     time.Time     `json:"last_activity"`
	AverageStayTime  time.Duration `json:"average_stay_time"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Details string `json:"details,omitempty"`
}

type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
}