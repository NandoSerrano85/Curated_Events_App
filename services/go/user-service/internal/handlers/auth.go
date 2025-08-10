package handlers

import (
	"net/http"

	"events-platform/services/go/user-service/internal/models"
	"events-platform/services/go/user-service/internal/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type AuthHandler struct {
	authService *services.AuthService
	logger      *zap.Logger
}

func NewAuthHandler(authService *services.AuthService, logger *zap.Logger) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		logger:      logger,
	}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ipAddress := c.ClientIP()
	authResponse, err := h.authService.Login(c.Request.Context(), &req, ipAddress)
	if err != nil {
		h.logger.Warn("Login failed", 
			zap.String("email", req.Email), 
			zap.String("ip", ipAddress), 
			zap.Error(err))
		
		switch err {
		case services.ErrInvalidCredentials:
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		case services.ErrTooManyAttempts:
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Too many login attempts. Please try again later."})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Login failed"})
		}
		return
	}

	h.logger.Info("User logged in successfully", 
		zap.String("email", req.Email), 
		zap.String("user_id", authResponse.User.ID.String()))

	c.JSON(http.StatusOK, authResponse)
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req models.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	authResponse, err := h.authService.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		h.logger.Warn("Token refresh failed", zap.Error(err))
		
		switch err {
		case services.ErrTokenExpired, services.ErrTokenInvalid:
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired refresh token"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Token refresh failed"})
		}
		return
	}

	c.JSON(http.StatusOK, authResponse)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req models.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.authService.Logout(c.Request.Context(), req.RefreshToken)
	if err != nil {
		h.logger.Error("Logout failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Logout failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}