package handlers

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
)

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "healthy",
		"service": "api-gateway",
		"timestamp": time.Now().Unix(),
	})
}

func ProxyToUserService(serviceURL string) gin.HandlerFunc {
	return createReverseProxy(serviceURL, "/api/v1/users")
}

func ProxyToEventService(serviceURL string) gin.HandlerFunc {
	return createReverseProxy(serviceURL, "/api/v1/events")
}

func ProxyToSearchService(serviceURL string) gin.HandlerFunc {
	return createReverseProxy(serviceURL, "/api/v1/search")
}

func ProxyToPaymentService(serviceURL string) gin.HandlerFunc {
	return createReverseProxy(serviceURL, "/api/v1/payments")
}

func ProxyToWebSocketService(serviceURL string) gin.HandlerFunc {
	return createReverseProxy(serviceURL, "/ws")
}

func createReverseProxy(serviceURL, pathPrefix string) gin.HandlerFunc {
	target, _ := url.Parse(serviceURL)
	
	proxy := httputil.NewSingleHostReverseProxy(target)
	
	// Customize the proxy to handle authentication headers and modify requests
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		
		// Forward auth headers and user context
		req.Header.Set("X-Forwarded-Host", req.Header.Get("Host"))
		req.Header.Set("X-Forwarded-Proto", "http")
		
		// Remove the API gateway prefix from the path
		req.URL.Path = pathPrefix + req.URL.Path
		req.URL.RawQuery = req.URL.RawQuery
	}
	
	// Handle errors
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error": "Service unavailable"}`))
	}
	
	return func(c *gin.Context) {
		// Read the request body to forward user context
		var bodyBytes []byte
		if c.Request.Body != nil {
			bodyBytes, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}
		
		// Add user context headers if available
		if userID, exists := c.Get("userID"); exists {
			c.Request.Header.Set("X-User-ID", userID.(string))
		}
		if email, exists := c.Get("email"); exists {
			c.Request.Header.Set("X-User-Email", email.(string))
		}
		
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}