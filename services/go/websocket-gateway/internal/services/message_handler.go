package services

import (
	"encoding/json"
	"time"

	"events-platform/services/go/websocket-gateway/internal/database"
	"events-platform/services/go/websocket-gateway/internal/models"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
	"go.uber.org/zap"
)

type MessageHandler struct {
	connectionManager *ConnectionManager
	nats              *nats.Conn
	logger            *zap.Logger
	subscriptions     []*nats.Subscription
}

func NewMessageHandler(cm *ConnectionManager, nc *nats.Conn, logger *zap.Logger) *MessageHandler {
	return &MessageHandler{
		connectionManager: cm,
		nats:              nc,
		logger:            logger,
		subscriptions:     make([]*nats.Subscription, 0),
	}
}

func (mh *MessageHandler) Start() error {
	// Subscribe to various NATS subjects for broadcasting messages
	if err := mh.subscribeToEventUpdates(); err != nil {
		return err
	}
	
	if err := mh.subscribeToNotifications(); err != nil {
		return err
	}
	
	if err := mh.subscribeToBroadcasts(); err != nil {
		return err
	}
	
	if err := mh.subscribeToLiveFeatures(); err != nil {
		return err
	}

	mh.logger.Info("Message handler started with subscriptions")
	return nil
}

func (mh *MessageHandler) Stop() {
	for _, sub := range mh.subscriptions {
		sub.Unsubscribe()
	}
	mh.subscriptions = nil
	mh.logger.Info("Message handler stopped")
}

func (mh *MessageHandler) subscribeToEventUpdates() error {
	// Event update notifications
	eventSub, err := mh.nats.Subscribe(database.EventUpdateWSSubject, mh.handleEventUpdate)
	if err != nil {
		return err
	}
	mh.subscriptions = append(mh.subscriptions, eventSub)

	// Event registration notifications
	regSub, err := mh.nats.Subscribe(database.EventRegistrationWSSubject, mh.handleEventRegistration)
	if err != nil {
		return err
	}
	mh.subscriptions = append(mh.subscriptions, regSub)

	// Event reminder notifications
	reminderSub, err := mh.nats.Subscribe(database.EventReminderWSSubject, mh.handleEventReminder)
	if err != nil {
		return err
	}
	mh.subscriptions = append(mh.subscriptions, reminderSub)

	return nil
}

func (mh *MessageHandler) subscribeToNotifications() error {
	// General notifications
	notifSub, err := mh.nats.Subscribe(database.NotificationSubject, mh.handleNotification)
	if err != nil {
		return err
	}
	mh.subscriptions = append(mh.subscriptions, notifSub)

	return nil
}

func (mh *MessageHandler) subscribeToBroadcasts() error {
	// User-specific broadcasts
	userSub, err := mh.nats.Subscribe(database.BroadcastToUserSubject+"*", mh.handleUserBroadcast)
	if err != nil {
		return err
	}
	mh.subscriptions = append(mh.subscriptions, userSub)

	// Room-specific broadcasts
	roomSub, err := mh.nats.Subscribe(database.BroadcastToRoomSubject+"*", mh.handleRoomBroadcast)
	if err != nil {
		return err
	}
	mh.subscriptions = append(mh.subscriptions, roomSub)

	// Global broadcasts
	globalSub, err := mh.nats.Subscribe(database.BroadcastGlobalSubject, mh.handleGlobalBroadcast)
	if err != nil {
		return err
	}
	mh.subscriptions = append(mh.subscriptions, globalSub)

	return nil
}

func (mh *MessageHandler) subscribeToLiveFeatures() error {
	// Live location updates
	locationSub, err := mh.nats.Subscribe(database.LiveLocationSubject, mh.handleLiveLocation)
	if err != nil {
		return err
	}
	mh.subscriptions = append(mh.subscriptions, locationSub)

	// Live attendance updates
	attendanceSub, err := mh.nats.Subscribe(database.LiveAttendanceSubject, mh.handleLiveAttendance)
	if err != nil {
		return err
	}
	mh.subscriptions = append(mh.subscriptions, attendanceSub)

	// Live polls
	pollSub, err := mh.nats.Subscribe(database.LivePollSubject, mh.handleLivePolls)
	if err != nil {
		return err
	}
	mh.subscriptions = append(mh.subscriptions, pollSub)

	// Live Q&A
	qnaSub, err := mh.nats.Subscribe(database.LiveQnASubject, mh.handleLiveQnA)
	if err != nil {
		return err
	}
	mh.subscriptions = append(mh.subscriptions, qnaSub)

	return nil
}

func (mh *MessageHandler) handleEventUpdate(msg *nats.Msg) {
	var eventData map[string]interface{}
	if err := json.Unmarshal(msg.Data, &eventData); err != nil {
		mh.logger.Error("Failed to unmarshal event update", zap.Error(err))
		return
	}

	wsMessage := models.Message{
		ID:   uuid.New(),
		Type: models.MessageTypeEventUpdate,
		Data: eventData,
		Timestamp: time.Now(),
	}

	// Broadcast to event room if event_id is present
	if eventID, ok := eventData["event_id"].(string); ok {
		roomID := "event:" + eventID
		mh.connectionManager.BroadcastToRoom(roomID, wsMessage)
	}

	mh.logger.Debug("Handled event update", zap.Any("data", eventData))
}

func (mh *MessageHandler) handleEventRegistration(msg *nats.Msg) {
	var regData map[string]interface{}
	if err := json.Unmarshal(msg.Data, &regData); err != nil {
		mh.logger.Error("Failed to unmarshal event registration", zap.Error(err))
		return
	}

	wsMessage := models.Message{
		ID:   uuid.New(),
		Type: models.MessageTypeEventRegistration,
		Data: regData,
		Timestamp: time.Now(),
	}

	// Send to specific user if user_id is present
	if userIDStr, ok := regData["user_id"].(string); ok {
		if userID, err := uuid.Parse(userIDStr); err == nil {
			mh.connectionManager.SendToUser(userID, wsMessage)
		}
	}

	// Also broadcast to event room
	if eventID, ok := regData["event_id"].(string); ok {
		roomID := "event:" + eventID
		mh.connectionManager.BroadcastToRoom(roomID, wsMessage)
	}

	mh.logger.Debug("Handled event registration", zap.Any("data", regData))
}

func (mh *MessageHandler) handleEventReminder(msg *nats.Msg) {
	var reminderData map[string]interface{}
	if err := json.Unmarshal(msg.Data, &reminderData); err != nil {
		mh.logger.Error("Failed to unmarshal event reminder", zap.Error(err))
		return
	}

	wsMessage := models.Message{
		ID:   uuid.New(),
		Type: models.MessageTypeEventReminder,
		Data: reminderData,
		Timestamp: time.Now(),
	}

	// Send to specific user
	if userIDStr, ok := reminderData["user_id"].(string); ok {
		if userID, err := uuid.Parse(userIDStr); err == nil {
			mh.connectionManager.SendToUser(userID, wsMessage)
		}
	}

	mh.logger.Debug("Handled event reminder", zap.Any("data", reminderData))
}

func (mh *MessageHandler) handleNotification(msg *nats.Msg) {
	var notifData map[string]interface{}
	if err := json.Unmarshal(msg.Data, &notifData); err != nil {
		mh.logger.Error("Failed to unmarshal notification", zap.Error(err))
		return
	}

	wsMessage := models.Message{
		ID:   uuid.New(),
		Type: models.MessageTypeNotification,
		Data: notifData,
		Timestamp: time.Now(),
	}

	// Send to specific user
	if userIDStr, ok := notifData["user_id"].(string); ok {
		if userID, err := uuid.Parse(userIDStr); err == nil {
			mh.connectionManager.SendToUser(userID, wsMessage)
		}
	}

	mh.logger.Debug("Handled notification", zap.Any("data", notifData))
}

func (mh *MessageHandler) handleUserBroadcast(msg *nats.Msg) {
	// Extract user ID from subject
	subject := msg.Subject
	userID := subject[len(database.BroadcastToUserSubject):]

	var broadcastData map[string]interface{}
	if err := json.Unmarshal(msg.Data, &broadcastData); err != nil {
		mh.logger.Error("Failed to unmarshal user broadcast", zap.Error(err))
		return
	}

	wsMessage := models.Message{
		ID:   uuid.New(),
		Type: models.MessageType(broadcastData["type"].(string)),
		Data: broadcastData["data"].(map[string]interface{}),
		Timestamp: time.Now(),
	}

	if uid, err := uuid.Parse(userID); err == nil {
		mh.connectionManager.SendToUser(uid, wsMessage)
	}

	mh.logger.Debug("Handled user broadcast", 
		zap.String("user_id", userID), 
		zap.Any("data", broadcastData))
}

func (mh *MessageHandler) handleRoomBroadcast(msg *nats.Msg) {
	// Extract room ID from subject
	subject := msg.Subject
	roomID := subject[len(database.BroadcastToRoomSubject):]

	var broadcastData map[string]interface{}
	if err := json.Unmarshal(msg.Data, &broadcastData); err != nil {
		mh.logger.Error("Failed to unmarshal room broadcast", zap.Error(err))
		return
	}

	wsMessage := models.Message{
		ID:   uuid.New(),
		Type: models.MessageType(broadcastData["type"].(string)),
		Data: broadcastData["data"].(map[string]interface{}),
		Timestamp: time.Now(),
	}

	mh.connectionManager.BroadcastToRoom(roomID, wsMessage)

	mh.logger.Debug("Handled room broadcast", 
		zap.String("room_id", roomID), 
		zap.Any("data", broadcastData))
}

func (mh *MessageHandler) handleGlobalBroadcast(msg *nats.Msg) {
	var broadcastData map[string]interface{}
	if err := json.Unmarshal(msg.Data, &broadcastData); err != nil {
		mh.logger.Error("Failed to unmarshal global broadcast", zap.Error(err))
		return
	}

	wsMessage := models.Message{
		ID:   uuid.New(),
		Type: models.MessageType(broadcastData["type"].(string)),
		Data: broadcastData["data"].(map[string]interface{}),
		Timestamp: time.Now(),
	}

	// Broadcast to all connected clients
	data, _ := json.Marshal(wsMessage)
	mh.connectionManager.broadcast <- data

	mh.logger.Debug("Handled global broadcast", zap.Any("data", broadcastData))
}

func (mh *MessageHandler) handleLiveLocation(msg *nats.Msg) {
	var locationData map[string]interface{}
	if err := json.Unmarshal(msg.Data, &locationData); err != nil {
		mh.logger.Error("Failed to unmarshal live location", zap.Error(err))
		return
	}

	wsMessage := models.Message{
		ID:   uuid.New(),
		Type: models.MessageTypeLiveLocation,
		Data: locationData,
		Timestamp: time.Now(),
	}

	// Broadcast to event live room
	if eventID, ok := locationData["event_id"].(string); ok {
		roomID := "event_live:" + eventID
		mh.connectionManager.BroadcastToRoom(roomID, wsMessage)
	}

	mh.logger.Debug("Handled live location", zap.Any("data", locationData))
}

func (mh *MessageHandler) handleLiveAttendance(msg *nats.Msg) {
	var attendanceData map[string]interface{}
	if err := json.Unmarshal(msg.Data, &attendanceData); err != nil {
		mh.logger.Error("Failed to unmarshal live attendance", zap.Error(err))
		return
	}

	wsMessage := models.Message{
		ID:   uuid.New(),
		Type: models.MessageTypeLiveAttendance,
		Data: attendanceData,
		Timestamp: time.Now(),
	}

	// Broadcast to event live room
	if eventID, ok := attendanceData["event_id"].(string); ok {
		roomID := "event_live:" + eventID
		mh.connectionManager.BroadcastToRoom(roomID, wsMessage)
	}

	mh.logger.Debug("Handled live attendance", zap.Any("data", attendanceData))
}

func (mh *MessageHandler) handleLivePolls(msg *nats.Msg) {
	var pollData map[string]interface{}
	if err := json.Unmarshal(msg.Data, &pollData); err != nil {
		mh.logger.Error("Failed to unmarshal live poll", zap.Error(err))
		return
	}

	wsMessage := models.Message{
		ID:   uuid.New(),
		Type: models.MessageTypeLivePolls,
		Data: pollData,
		Timestamp: time.Now(),
	}

	// Broadcast to event live room
	if eventID, ok := pollData["event_id"].(string); ok {
		roomID := "event_live:" + eventID
		mh.connectionManager.BroadcastToRoom(roomID, wsMessage)
	}

	mh.logger.Debug("Handled live poll", zap.Any("data", pollData))
}

func (mh *MessageHandler) handleLiveQnA(msg *nats.Msg) {
	var qnaData map[string]interface{}
	if err := json.Unmarshal(msg.Data, &qnaData); err != nil {
		mh.logger.Error("Failed to unmarshal live Q&A", zap.Error(err))
		return
	}

	wsMessage := models.Message{
		ID:   uuid.New(),
		Type: models.MessageTypeLiveQnA,
		Data: qnaData,
		Timestamp: time.Now(),
	}

	// Broadcast to event live room
	if eventID, ok := qnaData["event_id"].(string); ok {
		roomID := "event_live:" + eventID
		mh.connectionManager.BroadcastToRoom(roomID, wsMessage)
	}

	mh.logger.Debug("Handled live Q&A", zap.Any("data", qnaData))
}

// Utility methods for publishing messages to NATS
func (mh *MessageHandler) PublishToUser(userID uuid.UUID, messageType models.MessageType, data map[string]interface{}) error {
	message := map[string]interface{}{
		"type": string(messageType),
		"data": data,
	}

	msgData, err := json.Marshal(message)
	if err != nil {
		return err
	}

	subject := database.BroadcastToUserSubject + userID.String()
	return mh.nats.Publish(subject, msgData)
}

func (mh *MessageHandler) PublishToRoom(roomID string, messageType models.MessageType, data map[string]interface{}) error {
	message := map[string]interface{}{
		"type": string(messageType),
		"data": data,
	}

	msgData, err := json.Marshal(message)
	if err != nil {
		return err
	}

	subject := database.BroadcastToRoomSubject + roomID
	return mh.nats.Publish(subject, msgData)
}

func (mh *MessageHandler) PublishGlobal(messageType models.MessageType, data map[string]interface{}) error {
	message := map[string]interface{}{
		"type": string(messageType),
		"data": data,
	}

	msgData, err := json.Marshal(message)
	if err != nil {
		return err
	}

	return mh.nats.Publish(database.BroadcastGlobalSubject, msgData)
}