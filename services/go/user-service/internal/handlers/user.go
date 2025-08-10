package handlers

import (
	"net/http"
	"time"

	"events-platform/services/go/user-service/internal/models"
	"events-platform/services/go/user-service/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type UserHandler struct {
	userService *services.UserService
	logger      *zap.Logger
}

func NewUserHandler(userService *services.UserService, logger *zap.Logger) *UserHandler {
	return &UserHandler{
		userService: userService,
		logger:      logger,
	}
}

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "user-service",
		"timestamp": time.Now().Unix(),
	})
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userService.CreateUser(c.Request.Context(), &req)
	if err != nil {
		h.logger.Error("User creation failed", 
			zap.String("email", req.Email), 
			zap.Error(err))
		
		switch err {
		case services.ErrUserExists:
			c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		case services.ErrWeakPassword:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password does not meet requirements"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "User creation failed"})
		}
		return
	}

	h.logger.Info("User created successfully", 
		zap.String("user_id", user.ID.String()), 
		zap.String("email", user.Email))

	c.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully",
		"user":    user,
	})
}

func (h *UserHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	user, err := h.userService.GetUserByID(c.Request.Context(), userID.(uuid.UUID))
	if err != nil {
		h.logger.Error("Failed to get user profile", 
			zap.String("user_id", userID.(uuid.UUID).String()), 
			zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userService.UpdateUser(c.Request.Context(), userID.(uuid.UUID), &req)
	if err != nil {
		h.logger.Error("Failed to update user profile", 
			zap.String("user_id", userID.(uuid.UUID).String()), 
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	h.logger.Info("User profile updated", 
		zap.String("user_id", userID.(uuid.UUID).String()))

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) DeleteProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	err := h.userService.DeleteUser(c.Request.Context(), userID.(uuid.UUID))
	if err != nil {
		h.logger.Error("Failed to delete user", 
			zap.String("user_id", userID.(uuid.UUID).String()), 
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	h.logger.Info("User deleted", 
		zap.String("user_id", userID.(uuid.UUID).String()))

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.userService.ChangePassword(c.Request.Context(), userID.(uuid.UUID), &req)
	if err != nil {
		h.logger.Error("Password change failed", 
			zap.String("user_id", userID.(uuid.UUID).String()), 
			zap.Error(err))
		
		switch err {
		case services.ErrInvalidCredentials:
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to change password"})
		}
		return
	}

	h.logger.Info("Password changed successfully", 
		zap.String("user_id", userID.(uuid.UUID).String()))

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

func (h *UserHandler) GetPreferences(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	preferences, err := h.userService.GetUserPreferences(c.Request.Context(), userID.(uuid.UUID))
	if err != nil {
		h.logger.Error("Failed to get user preferences", 
			zap.String("user_id", userID.(uuid.UUID).String()), 
			zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Preferences not found"})
		return
	}

	c.JSON(http.StatusOK, preferences)
}

func (h *UserHandler) UpdatePreferences(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	var preferences models.UserPreferences
	if err := c.ShouldBindJSON(&preferences); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updatedPreferences, err := h.userService.UpdateUserPreferences(c.Request.Context(), userID.(uuid.UUID), &preferences)
	if err != nil {
		h.logger.Error("Failed to update user preferences", 
			zap.String("user_id", userID.(uuid.UUID).String()), 
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preferences"})
		return
	}

	h.logger.Info("User preferences updated", 
		zap.String("user_id", userID.(uuid.UUID).String()))

	c.JSON(http.StatusOK, updatedPreferences)
}