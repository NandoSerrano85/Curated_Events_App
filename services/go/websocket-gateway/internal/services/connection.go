package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"events-platform/services/go/websocket-gateway/internal/database"
	"events-platform/services/go/websocket-gateway/internal/models"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// In production, implement proper origin checking
		return true
	},
}

type Client struct {
	ID         uuid.UUID
	UserID     uuid.UUID
	UserName   string
	UserEmail  string
	Connection *websocket.Conn
	Send       chan []byte
	Manager    *ConnectionManager
	IPAddress  string
	UserAgent  string
	ConnectedAt time.Time
	LastPing   time.Time
	Rooms      map[string]bool
	mu         sync.RWMutex
}

type ConnectionManager struct {
	clients    map[uuid.UUID]*Client
	rooms      map[string]map[uuid.UUID]*Client
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	redis      *redis.Client
	logger     *zap.Logger
	mu         sync.RWMutex
	stats      ConnectionStats
}

type ConnectionStats struct {
	TotalConnections  int64
	ActiveConnections int64
	MessagesSent      int64
	MessagesReceived  int64
	TotalRooms        int64
	StartTime         time.Time
}

func NewConnectionManager(redis *redis.Client, logger *zap.Logger) *ConnectionManager {
	return &ConnectionManager{
		clients:    make(map[uuid.UUID]*Client),
		rooms:      make(map[string]map[uuid.UUID]*Client),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte, 256),
		redis:      redis,
		logger:     logger,
		stats: ConnectionStats{
			StartTime: time.Now(),
		},
	}
}

func (cm *ConnectionManager) Start() {
	go cm.run()
	go cm.updateStats()
}

func (cm *ConnectionManager) run() {
	for {
		select {
		case client := <-cm.register:
			cm.registerClient(client)

		case client := <-cm.unregister:
			cm.unregisterClient(client)

		case message := <-cm.broadcast:
			cm.broadcastMessage(message)
		}
	}
}

func (cm *ConnectionManager) HandleWebSocket(w http.ResponseWriter, r *http.Request, userID uuid.UUID, userName, userEmail string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		cm.logger.Error("WebSocket upgrade failed", zap.Error(err))
		return
	}

	client := &Client{
		ID:          uuid.New(),
		UserID:      userID,
		UserName:    userName,
		UserEmail:   userEmail,
		Connection:  conn,
		Send:        make(chan []byte, 256),
		Manager:     cm,
		IPAddress:   r.RemoteAddr,
		UserAgent:   r.UserAgent(),
		ConnectedAt: time.Now(),
		LastPing:    time.Now(),
		Rooms:       make(map[string]bool),
	}

	cm.register <- client

	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump()
}

func (cm *ConnectionManager) registerClient(client *Client) {
	cm.mu.Lock()
	cm.clients[client.ID] = client
	cm.stats.ActiveConnections++
	cm.stats.TotalConnections++
	cm.mu.Unlock()

	// Store connection in Redis
	cm.storeConnectionInRedis(client)

	// Send connection confirmation
	connectionMsg := models.Message{
		ID:        uuid.New(),
		Type:      models.MessageTypeConnect,
		Data: map[string]interface{}{
			"connection_id": client.ID.String(),
			"user_id":       client.UserID.String(),
			"status":        "connected",
		},
		Timestamp: time.Now(),
	}

	client.sendMessage(connectionMsg)

	cm.logger.Info("Client connected",
		zap.String("client_id", client.ID.String()),
		zap.String("user_id", client.UserID.String()),
		zap.String("ip", client.IPAddress))
}

func (cm *ConnectionManager) unregisterClient(client *Client) {
	cm.mu.Lock()
	if _, ok := cm.clients[client.ID]; ok {
		delete(cm.clients, client.ID)
		close(client.Send)
		cm.stats.ActiveConnections--
	}
	cm.mu.Unlock()

	// Remove from all rooms
	client.mu.RLock()
	rooms := make([]string, 0, len(client.Rooms))
	for roomID := range client.Rooms {
		rooms = append(rooms, roomID)
	}
	client.mu.RUnlock()

	for _, roomID := range rooms {
		cm.leaveRoom(client, roomID)
	}

	// Remove connection from Redis
	cm.removeConnectionFromRedis(client)

	client.Connection.Close()

	cm.logger.Info("Client disconnected",
		zap.String("client_id", client.ID.String()),
		zap.String("user_id", client.UserID.String()))
}

func (cm *ConnectionManager) JoinRoom(clientID uuid.UUID, roomID string) error {
	cm.mu.RLock()
	client, exists := cm.clients[clientID]
	cm.mu.RUnlock()

	if !exists {
		return ErrClientNotFound
	}

	return cm.joinRoom(client, roomID)
}

func (cm *ConnectionManager) LeaveRoom(clientID uuid.UUID, roomID string) error {
	cm.mu.RLock()
	client, exists := cm.clients[clientID]
	cm.mu.RUnlock()

	if !exists {
		return ErrClientNotFound
	}

	return cm.leaveRoom(client, roomID)
}

func (cm *ConnectionManager) joinRoom(client *Client, roomID string) error {
	cm.mu.Lock()
	if cm.rooms[roomID] == nil {
		cm.rooms[roomID] = make(map[uuid.UUID]*Client)
		cm.stats.TotalRooms++
	}
	cm.rooms[roomID][client.ID] = client
	cm.mu.Unlock()

	client.mu.Lock()
	client.Rooms[roomID] = true
	client.mu.Unlock()

	// Update Redis
	ctx := context.Background()
	cm.redis.SAdd(ctx, database.WSRoomConnectionsKey(roomID), client.ID.String())
	cm.redis.SAdd(ctx, database.WSUserConnectionsKey(client.UserID.String()), roomID)

	// Notify other clients in the room
	joinMsg := models.Message{
		ID:   uuid.New(),
		Type: models.MessageTypeRoomUpdate,
		Room: &roomID,
		Data: map[string]interface{}{
			"action":  "user_joined",
			"user_id": client.UserID.String(),
			"user_name": client.UserName,
		},
		Timestamp: time.Now(),
	}

	cm.broadcastToRoom(roomID, joinMsg, &client.ID)

	cm.logger.Debug("Client joined room",
		zap.String("client_id", client.ID.String()),
		zap.String("room_id", roomID))

	return nil
}

func (cm *ConnectionManager) leaveRoom(client *Client, roomID string) error {
	cm.mu.Lock()
	if room, exists := cm.rooms[roomID]; exists {
		delete(room, client.ID)
		if len(room) == 0 {
			delete(cm.rooms, roomID)
			cm.stats.TotalRooms--
		}
	}
	cm.mu.Unlock()

	client.mu.Lock()
	delete(client.Rooms, roomID)
	client.mu.Unlock()

	// Update Redis
	ctx := context.Background()
	cm.redis.SRem(ctx, database.WSRoomConnectionsKey(roomID), client.ID.String())
	cm.redis.SRem(ctx, database.WSUserConnectionsKey(client.UserID.String()), roomID)

	// Notify other clients in the room
	leaveMsg := models.Message{
		ID:   uuid.New(),
		Type: models.MessageTypeRoomUpdate,
		Room: &roomID,
		Data: map[string]interface{}{
			"action":  "user_left",
			"user_id": client.UserID.String(),
			"user_name": client.UserName,
		},
		Timestamp: time.Now(),
	}

	cm.broadcastToRoom(roomID, leaveMsg, &client.ID)

	cm.logger.Debug("Client left room",
		zap.String("client_id", client.ID.String()),
		zap.String("room_id", roomID))

	return nil
}

func (cm *ConnectionManager) SendToUser(userID uuid.UUID, message models.Message) error {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	sent := false
	for _, client := range cm.clients {
		if client.UserID == userID {
			client.sendMessage(message)
			sent = true
		}
	}

	if !sent {
		return ErrUserNotConnected
	}

	return nil
}

func (cm *ConnectionManager) BroadcastToRoom(roomID string, message models.Message) error {
	return cm.broadcastToRoom(roomID, message, nil)
}

func (cm *ConnectionManager) broadcastToRoom(roomID string, message models.Message, excludeClient *uuid.UUID) error {
	cm.mu.RLock()
	room, exists := cm.rooms[roomID]
	if !exists {
		cm.mu.RUnlock()
		return ErrRoomNotFound
	}

	clients := make([]*Client, 0, len(room))
	for _, client := range room {
		if excludeClient == nil || client.ID != *excludeClient {
			clients = append(clients, client)
		}
	}
	cm.mu.RUnlock()

	for _, client := range clients {
		client.sendMessage(message)
	}

	return nil
}

func (cm *ConnectionManager) broadcastMessage(data []byte) {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	for _, client := range cm.clients {
		select {
		case client.Send <- data:
		default:
			close(client.Send)
			delete(cm.clients, client.ID)
		}
	}
}

func (cm *ConnectionManager) GetStats() models.ConnectionStats {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	roomCounts := make(map[string]int)
	userCounts := make(map[string]int)

	for roomID, clients := range cm.rooms {
		roomCounts[roomID] = len(clients)
	}

	for _, client := range cm.clients {
		userCounts[client.UserID.String()]++
	}

	return models.ConnectionStats{
		TotalConnections:    int(cm.stats.ActiveConnections),
		ConnectionsByRoom:   roomCounts,
		ConnectionsByUser:   userCounts,
		MessagesSent:        cm.stats.MessagesSent,
		MessagesReceived:    cm.stats.MessagesReceived,
		ActiveRooms:         len(cm.rooms),
		Uptime:             time.Since(cm.stats.StartTime),
	}
}

func (cm *ConnectionManager) storeConnectionInRedis(client *Client) {
	ctx := context.Background()
	connectionData := map[string]interface{}{
		"id":           client.ID.String(),
		"user_id":      client.UserID.String(),
		"user_name":    client.UserName,
		"user_email":   client.UserEmail,
		"ip_address":   client.IPAddress,
		"user_agent":   client.UserAgent,
		"connected_at": client.ConnectedAt.Unix(),
	}

	data, _ := json.Marshal(connectionData)
	cm.redis.Set(ctx, database.WSConnectionKey(client.ID.String()), data, time.Hour)
	cm.redis.SAdd(ctx, database.WSUserConnectionsKey(client.UserID.String()), client.ID.String())
}

func (cm *ConnectionManager) removeConnectionFromRedis(client *Client) {
	ctx := context.Background()
	cm.redis.Del(ctx, database.WSConnectionKey(client.ID.String()))
	cm.redis.SRem(ctx, database.WSUserConnectionsKey(client.UserID.String()), client.ID.String())
}

func (cm *ConnectionManager) updateStats() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		ctx := context.Background()
		stats := cm.GetStats()
		
		data, _ := json.Marshal(stats)
		cm.redis.Set(ctx, database.WSConnectionStatsKey, data, time.Minute*5)
	}
}

// Client methods
func (c *Client) readPump() {
	defer func() {
		c.Manager.unregister <- c
	}()

	c.Connection.SetReadLimit(512)
	c.Connection.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Connection.SetPongHandler(func(string) error {
		c.LastPing = time.Now()
		c.Connection.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Connection.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				c.Manager.logger.Error("WebSocket error", zap.Error(err))
			}
			break
		}

		c.Manager.stats.MessagesReceived++
		
		// Handle incoming message
		c.handleMessage(message)
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Connection.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Connection.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Connection.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Connection.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

			c.Manager.stats.MessagesSent++

		case <-ticker.C:
			c.Connection.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Connection.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) handleMessage(data []byte) {
	var msg models.Message
	if err := json.Unmarshal(data, &msg); err != nil {
		c.Manager.logger.Error("Invalid message format", zap.Error(err))
		return
	}

	msg.From = c.UserID
	msg.Timestamp = time.Now()

	// Handle different message types
	switch msg.Type {
	case models.MessageTypePing:
		c.handlePing()
	case models.MessageTypeJoinRoom:
		c.handleJoinRoom(msg)
	case models.MessageTypeLeaveRoom:
		c.handleLeaveRoom(msg)
	case models.MessageTypeRoomMessage:
		c.handleRoomMessage(msg)
	case models.MessageTypeChat:
		c.handleChatMessage(msg)
	case models.MessageTypeTyping:
		c.handleTyping(msg)
	default:
		c.Manager.logger.Warn("Unknown message type", zap.String("type", string(msg.Type)))
	}
}

func (c *Client) handlePing() {
	pongMsg := models.Message{
		ID:        uuid.New(),
		Type:      models.MessageTypePong,
		Timestamp: time.Now(),
	}
	c.sendMessage(pongMsg)
}

func (c *Client) handleJoinRoom(msg models.Message) {
	roomID, ok := msg.Data["room_id"].(string)
	if !ok {
		c.sendError("Invalid room_id")
		return
	}

	if err := c.Manager.joinRoom(c, roomID); err != nil {
		c.sendError("Failed to join room: " + err.Error())
	}
}

func (c *Client) handleLeaveRoom(msg models.Message) {
	roomID, ok := msg.Data["room_id"].(string)
	if !ok {
		c.sendError("Invalid room_id")
		return
	}

	if err := c.Manager.leaveRoom(c, roomID); err != nil {
		c.sendError("Failed to leave room: " + err.Error())
	}
}

func (c *Client) handleRoomMessage(msg models.Message) {
	roomID, ok := msg.Data["room_id"].(string)
	if !ok {
		c.sendError("Invalid room_id")
		return
	}

	// Check if client is in the room
	c.mu.RLock()
	inRoom := c.Rooms[roomID]
	c.mu.RUnlock()

	if !inRoom {
		c.sendError("Not in room")
		return
	}

	msg.Room = &roomID
	c.Manager.broadcastToRoom(roomID, msg, &c.ID)
}

func (c *Client) handleChatMessage(msg models.Message) {
	roomID, ok := msg.Data["room_id"].(string)
	if !ok {
		c.sendError("Invalid room_id")
		return
	}

	message, ok := msg.Data["message"].(string)
	if !ok {
		c.sendError("Invalid message")
		return
	}

	chatMsg := models.Message{
		ID:   uuid.New(),
		Type: models.MessageTypeChatMessage,
		From: c.UserID,
		Room: &roomID,
		Data: map[string]interface{}{
			"message":   message,
			"user_id":   c.UserID.String(),
			"user_name": c.UserName,
		},
		Timestamp: time.Now(),
	}

	c.Manager.broadcastToRoom(roomID, chatMsg, nil)
}

func (c *Client) handleTyping(msg models.Message) {
	roomID, ok := msg.Data["room_id"].(string)
	if !ok {
		return
	}

	typing, ok := msg.Data["typing"].(bool)
	if !ok {
		return
	}

	typingMsg := models.Message{
		ID:   uuid.New(),
		Type: models.MessageTypeTyping,
		From: c.UserID,
		Room: &roomID,
		Data: map[string]interface{}{
			"typing":    typing,
			"user_id":   c.UserID.String(),
			"user_name": c.UserName,
		},
		Timestamp: time.Now(),
	}

	c.Manager.broadcastToRoom(roomID, typingMsg, &c.ID)
}

func (c *Client) sendMessage(msg models.Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		c.Manager.logger.Error("Failed to marshal message", zap.Error(err))
		return
	}

	select {
	case c.Send <- data:
	default:
		close(c.Send)
	}
}

func (c *Client) sendError(message string) {
	errorMsg := models.Message{
		ID:   uuid.New(),
		Type: models.MessageTypeError,
		Data: map[string]interface{}{
			"error": message,
		},
		Timestamp: time.Now(),
	}
	c.sendMessage(errorMsg)
}

// Errors
var (
	ErrClientNotFound    = fmt.Errorf("client not found")
	ErrUserNotConnected  = fmt.Errorf("user not connected")
	ErrRoomNotFound      = fmt.Errorf("room not found")
)