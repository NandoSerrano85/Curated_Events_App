package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"time"

	"events-platform/services/go/user-service/internal/database"
	"events-platform/services/go/user-service/internal/models"

	"github.com/go-redis/redis/v8"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserNotFound      = errors.New("user not found")
	ErrTokenExpired      = errors.New("token expired")
	ErrTokenInvalid      = errors.New("token invalid")
	ErrTooManyAttempts   = errors.New("too many login attempts")
)

type AuthService struct {
	db          *sql.DB
	redis       *redis.Client
	jwtSecret   []byte
	logger      *zap.Logger
}

type JWTClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func NewAuthService(db *sql.DB, redis *redis.Client, jwtSecret string, logger *zap.Logger) *AuthService {
	return &AuthService{
		db:        db,
		redis:     redis,
		jwtSecret: []byte(jwtSecret),
		logger:    logger,
	}
}

func (s *AuthService) Login(ctx context.Context, req *models.LoginRequest, ipAddress string) (*models.AuthResponse, error) {
	// Check for too many login attempts
	if blocked, err := s.checkLoginAttempts(ctx, req.Email, ipAddress); err != nil {
		return nil, err
	} else if blocked {
		return nil, ErrTooManyAttempts
	}

	// Get user by email
	user, err := s.getUserByEmail(ctx, req.Email)
	if err != nil {
		s.recordLoginAttempt(ctx, req.Email, ipAddress, false)
		return nil, ErrInvalidCredentials
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		s.recordLoginAttempt(ctx, req.Email, ipAddress, false)
		return nil, ErrInvalidCredentials
	}

	// Record successful login
	s.recordLoginAttempt(ctx, req.Email, ipAddress, true)
	s.updateLastLogin(ctx, user.ID)

	// Generate tokens
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	user.PasswordHash = "" // Don't return password hash

	return &models.AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(24 * time.Hour).Unix(),
	}, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*models.AuthResponse, error) {
	// Hash the refresh token
	tokenHash := s.hashToken(refreshToken)

	// Check if token exists and is valid
	var userID uuid.UUID
	var expiresAt time.Time
	var revoked bool

	query := `SELECT user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = $1`
	err := s.db.QueryRowContext(ctx, query, tokenHash).Scan(&userID, &expiresAt, &revoked)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrTokenInvalid
		}
		return nil, err
	}

	if revoked || time.Now().After(expiresAt) {
		return nil, ErrTokenExpired
	}

	// Get user
	user, err := s.getUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Generate new access token
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	// Generate new refresh token
	newRefreshToken, err := s.generateRefreshToken(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Revoke old refresh token
	s.revokeRefreshToken(ctx, tokenHash)

	user.PasswordHash = ""

	return &models.AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		ExpiresAt:    time.Now().Add(24 * time.Hour).Unix(),
	}, nil
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	tokenHash := s.hashToken(refreshToken)
	return s.revokeRefreshToken(ctx, tokenHash)
}

func (s *AuthService) generateAccessToken(user *models.User) (string, error) {
	claims := JWTClaims{
		UserID: user.ID.String(),
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "events-platform",
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *AuthService) generateRefreshToken(ctx context.Context, userID uuid.UUID) (string, error) {
	// Generate random token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", err
	}
	token := hex.EncodeToString(tokenBytes)
	tokenHash := s.hashToken(token)

	// Store in database
	query := `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`
	expiresAt := time.Now().Add(30 * 24 * time.Hour) // 30 days
	_, err := s.db.ExecContext(ctx, query, userID, tokenHash, expiresAt)
	if err != nil {
		return "", err
	}

	return token, nil
}

func (s *AuthService) hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

func (s *AuthService) revokeRefreshToken(ctx context.Context, tokenHash string) error {
	query := `UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`
	_, err := s.db.ExecContext(ctx, query, tokenHash)
	return err
}

func (s *AuthService) checkLoginAttempts(ctx context.Context, email, ipAddress string) (bool, error) {
	// Check attempts for this email in the last 15 minutes
	emailKey := database.LoginAttemptsKey(email)
	attempts, err := s.redis.Get(ctx, emailKey).Int()
	if err != nil && err != redis.Nil {
		return false, err
	}

	if attempts >= 5 {
		return true, nil
	}

	return false, nil
}

func (s *AuthService) recordLoginAttempt(ctx context.Context, email, ipAddress string, success bool) {
	// Record in database
	query := `INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, $3)`
	s.db.ExecContext(ctx, query, email, ipAddress, success)

	if !success {
		// Increment failed attempts counter in Redis
		emailKey := database.LoginAttemptsKey(email)
		pipe := s.redis.TxPipeline()
		pipe.Incr(ctx, emailKey)
		pipe.Expire(ctx, emailKey, 15*time.Minute)
		pipe.Exec(ctx)
	} else {
		// Clear failed attempts on successful login
		emailKey := database.LoginAttemptsKey(email)
		s.redis.Del(ctx, emailKey)
	}
}

func (s *AuthService) updateLastLogin(ctx context.Context, userID uuid.UUID) {
	query := `UPDATE users SET last_login_at = NOW() WHERE id = $1`
	s.db.ExecContext(ctx, query, userID)
}

func (s *AuthService) getUserByEmail(ctx context.Context, email string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, username, password_hash, first_name, last_name, 
		       profile_picture, bio, location, date_of_birth, is_email_verified, 
		       is_active, last_login_at, created_at, updated_at
		FROM users 
		WHERE email = $1 AND is_active = true
	`
	err := s.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.Username, &user.PasswordHash,
		&user.FirstName, &user.LastName, &user.ProfilePicture,
		&user.Bio, &user.Location, &user.DateOfBirth,
		&user.IsEmailVerified, &user.IsActive, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (s *AuthService) getUserByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, username, password_hash, first_name, last_name, 
		       profile_picture, bio, location, date_of_birth, is_email_verified, 
		       is_active, last_login_at, created_at, updated_at
		FROM users 
		WHERE id = $1 AND is_active = true
	`
	err := s.db.QueryRowContext(ctx, query, userID).Scan(
		&user.ID, &user.Email, &user.Username, &user.PasswordHash,
		&user.FirstName, &user.LastName, &user.ProfilePicture,
		&user.Bio, &user.Location, &user.DateOfBirth,
		&user.IsEmailVerified, &user.IsActive, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}