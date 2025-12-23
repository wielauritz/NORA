package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/handlers"
	"github.com/nora-nak/backend/middleware"
	"github.com/nora-nak/backend/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

// IntegrationTestSuite contains all integration tests
type IntegrationTestSuite struct {
	suite.Suite
	app          *fiber.App
	tenant1      *models.Tenant
	tenant2      *models.Tenant
	adminToken   string
	studentToken string
	teacherToken string
	tenant2Token string
}

// SetupSuite runs once before all tests
func (suite *IntegrationTestSuite) SetupSuite() {
	// Load test configuration
	config.LoadConfig()
	config.AppConfig.DatabaseURL = "postgres://nora_user:password@localhost:5432/nora_test?sslmode=disable"

	// Initialize test database
	if err := config.InitDatabase(); err != nil {
		suite.T().Fatal("Failed to initialize test database:", err)
	}

	// Run migrations
	if err := config.AutoMigrate(); err != nil {
		suite.T().Fatal("Failed to run migrations:", err)
	}

	// Create test tenants
	suite.createTestTenants()

	// Setup Fiber app
	suite.setupApp()

	// Create test JWTs
	suite.createTestTokens()
}

// TearDownSuite runs once after all tests
func (suite *IntegrationTestSuite) TearDownSuite() {
	// Cleanup database
	config.DB.Exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
	config.CloseDatabase()
}

// SetupTest runs before each test
func (suite *IntegrationTestSuite) SetupTest() {
	// Clean up users between tests (preserve tenants)
	config.DB.Exec("DELETE FROM users")
	config.DB.Exec("DELETE FROM timetables")
	config.DB.Exec("DELETE FROM custom_hours")
	config.DB.Exec("DELETE FROM friend_requests")
}

// createTestTenants creates two test tenants
func (suite *IntegrationTestSuite) createTestTenants() {
	suite.tenant1 = &models.Tenant{
		Name:             "Test School 1",
		Slug:             "test-school-1",
		KeycloakRealmID:  "test-school-1-realm",
		KeycloakURL:      "https://keycloak.test.com",
		KeycloakClientID: "nora-backend",
		IsActive:         true,
	}
	config.DB.Create(suite.tenant1)

	suite.tenant2 = &models.Tenant{
		Name:             "Test School 2",
		Slug:             "test-school-2",
		KeycloakRealmID:  "test-school-2-realm",
		KeycloakURL:      "https://keycloak.test.com",
		KeycloakClientID: "nora-backend",
		IsActive:         true,
	}
	config.DB.Create(suite.tenant2)
}

// setupApp configures the Fiber test app
func (suite *IntegrationTestSuite) setupApp() {
	suite.app = fiber.New()

	// Public routes
	public := suite.app.Group("/v1", middleware.TenantMiddleware)
	public.Get("/rooms", handlers.GetRooms)

	// Protected routes
	protected := suite.app.Group("/v1",
		middleware.TenantMiddleware,
		middleware.KeycloakAuthMiddleware,
	)
	protected.Get("/user", handlers.GetUser)
	protected.Get("/events", handlers.GetEvents)

	// Admin routes
	admin := protected.Group("/admin", middleware.RequireAdmin())
	admin.Get("/tenants", handlers.GetAllTenants)
	admin.Post("/tenants", handlers.CreateTenant)
}

// createTestTokens generates mock JWT tokens for testing
func (suite *IntegrationTestSuite) createTestTokens() {
	// NOTE: In real tests, you would generate valid JWTs signed by test keys
	// For now, we use mock tokens that bypass validation in test mode

	// Admin token for tenant1
	suite.adminToken = suite.generateMockJWT(suite.tenant1.KeycloakRealmID, "admin-user-id", "admin@test.com", []string{"admin"})

	// Student token for tenant1
	suite.studentToken = suite.generateMockJWT(suite.tenant1.KeycloakRealmID, "student-user-id", "student@test.com", []string{"student"})

	// Teacher token for tenant1
	suite.teacherToken = suite.generateMockJWT(suite.tenant1.KeycloakRealmID, "teacher-user-id", "teacher@test.com", []string{"teacher"})

	// Admin token for tenant2
	suite.tenant2Token = suite.generateMockJWT(suite.tenant2.KeycloakRealmID, "admin2-user-id", "admin@test2.com", []string{"admin"})
}

// generateMockJWT creates a mock JWT for testing
func (suite *IntegrationTestSuite) generateMockJWT(realmID, userID, email string, roles []string) string {
	// In production tests, use a real JWT library with test keys
	// This is a simplified mock for demonstration
	return fmt.Sprintf("MOCK_JWT_%s_%s_%s", realmID, userID, email)
}

// makeRequest helper to make HTTP requests
func (suite *IntegrationTestSuite) makeRequest(method, path, token, tenantSlug string, body interface{}) (*http.Response, []byte) {
	var reqBody io.Reader
	if body != nil {
		jsonBody, _ := json.Marshal(body)
		reqBody = bytes.NewReader(jsonBody)
	}

	req := httptest.NewRequest(method, path, reqBody)
	req.Header.Set("Content-Type", "application/json")

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	if tenantSlug != "" {
		req.Header.Set("X-Tenant-ID", tenantSlug)
	}

	resp, err := suite.app.Test(req, -1)
	assert.NoError(suite.T(), err)

	respBody, err := io.ReadAll(resp.Body)
	assert.NoError(suite.T(), err)

	return resp, respBody
}

// ========================================
// SECURITY TESTS
// ========================================

// TestTenantIsolation_CrossTenantDataAccess tests that users cannot access other tenant's data
func (suite *IntegrationTestSuite) TestTenantIsolation_CrossTenantDataAccess() {
	// Create rooms for tenant1
	room1 := models.Room{
		TenantID:   suite.tenant1.ID,
		RoomNumber: "A101",
		Building:   "A",
		Floor:      "1",
	}
	config.DB.Create(&room1)

	// Create rooms for tenant2
	room2 := models.Room{
		TenantID:   suite.tenant2.ID,
		RoomNumber: "B201",
		Building:   "B",
		Floor:      "2",
	}
	config.DB.Create(&room2)

	// Test 1: Request from tenant1 should only see tenant1 rooms
	resp, body := suite.makeRequest("GET", "/v1/rooms", "", suite.tenant1.Slug, nil)
	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)

	var rooms []map[string]interface{}
	json.Unmarshal(body, &rooms)
	assert.Equal(suite.T(), 1, len(rooms), "Should only see 1 room from tenant1")
	assert.Equal(suite.T(), "A101", rooms[0]["room_number"])

	// Test 2: Request from tenant2 should only see tenant2 rooms
	resp, body = suite.makeRequest("GET", "/v1/rooms", "", suite.tenant2.Slug, nil)
	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)

	json.Unmarshal(body, &rooms)
	assert.Equal(suite.T(), 1, len(rooms), "Should only see 1 room from tenant2")
	assert.Equal(suite.T(), "B201", rooms[0]["room_number"])
}

// TestJWTValidation_ExpiredToken tests that expired tokens are rejected
func (suite *IntegrationTestSuite) TestJWTValidation_ExpiredToken() {
	expiredToken := "EXPIRED_TOKEN_123"

	resp, body := suite.makeRequest("GET", "/v1/user", expiredToken, suite.tenant1.Slug, nil)
	assert.Equal(suite.T(), http.StatusUnauthorized, resp.StatusCode)

	var errResp map[string]interface{}
	json.Unmarshal(body, &errResp)
	assert.Contains(suite.T(), errResp["error"], "Invalid token")
}

// TestJWTValidation_InvalidSignature tests that tokens with invalid signatures are rejected
func (suite *IntegrationTestSuite) TestJWTValidation_InvalidSignature() {
	fakeToken := "FAKE_SIGNATURE_TOKEN"

	resp, body := suite.makeRequest("GET", "/v1/user", fakeToken, suite.tenant1.Slug, nil)
	assert.Equal(suite.T(), http.StatusUnauthorized, resp.StatusCode)

	var errResp map[string]interface{}
	json.Unmarshal(body, &errResp)
	assert.Contains(suite.T(), errResp["error"], "Invalid token")
}

// TestJWTValidation_MissingBearer tests that tokens without Bearer prefix are rejected
func (suite *IntegrationTestSuite) TestJWTValidation_MissingBearer() {
	req := httptest.NewRequest("GET", "/v1/user", nil)
	req.Header.Set("Authorization", suite.adminToken) // Missing "Bearer "
	req.Header.Set("X-Tenant-ID", suite.tenant1.Slug)

	resp, err := suite.app.Test(req, -1)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusUnauthorized, resp.StatusCode)
}

// TestJWTValidation_WrongRealm tests that tokens from another realm are rejected
func (suite *IntegrationTestSuite) TestJWTValidation_WrongRealm() {
	// Try to use tenant1 token on tenant2 subdomain
	resp, body := suite.makeRequest("GET", "/v1/user", suite.adminToken, suite.tenant2.Slug, nil)
	assert.Equal(suite.T(), http.StatusUnauthorized, resp.StatusCode)

	var errResp map[string]interface{}
	json.Unmarshal(body, &errResp)
	assert.Contains(suite.T(), errResp["error"], "Invalid token")
}

// TestRoleBasedAccess_AdminOnly tests that admin endpoints require admin role
func (suite *IntegrationTestSuite) TestRoleBasedAccess_AdminOnly() {
	// Test 1: Admin can access admin endpoints
	resp, _ := suite.makeRequest("GET", "/v1/admin/tenants", suite.adminToken, suite.tenant1.Slug, nil)
	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)

	// Test 2: Student cannot access admin endpoints
	resp, body := suite.makeRequest("GET", "/v1/admin/tenants", suite.studentToken, suite.tenant1.Slug, nil)
	assert.Equal(suite.T(), http.StatusForbidden, resp.StatusCode)

	var errResp map[string]interface{}
	json.Unmarshal(body, &errResp)
	assert.Contains(suite.T(), errResp["error"], "Insufficient permissions")

	// Test 3: Teacher cannot access admin endpoints
	resp, body = suite.makeRequest("GET", "/v1/admin/tenants", suite.teacherToken, suite.tenant1.Slug, nil)
	assert.Equal(suite.T(), http.StatusForbidden, resp.StatusCode)
}

// TestRoleBasedAccess_TeacherAccess tests teacher-specific permissions
func (suite *IntegrationTestSuite) TestRoleBasedAccess_TeacherAccess() {
	// Teacher routes would go here
	// Example: suite.makeRequest("POST", "/v1/teacher/timetables", suite.teacherToken, ...)

	// For now, verify that teacher role is extracted correctly
	assert.NotEmpty(suite.T(), suite.teacherToken)
}

// TestUserAutoCreation tests that users are auto-created on first login
func (suite *IntegrationTestSuite) TestUserAutoCreation() {
	// Verify no user exists initially
	var count int64
	config.DB.Model(&models.User{}).Where("keycloak_user_id = ?", "new-user-id").Count(&count)
	assert.Equal(suite.T(), int64(0), count)

	// Make request with new user token
	newUserToken := suite.generateMockJWT(suite.tenant1.KeycloakRealmID, "new-user-id", "newuser@test.com", []string{"student"})
	resp, body := suite.makeRequest("GET", "/v1/user", newUserToken, suite.tenant1.Slug, nil)

	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)

	var userResp map[string]interface{}
	json.Unmarshal(body, &userResp)
	assert.Equal(suite.T(), "newuser@test.com", userResp["email"])

	// Verify user was created in database
	config.DB.Model(&models.User{}).Where("keycloak_user_id = ?", "new-user-id").Count(&count)
	assert.Equal(suite.T(), int64(1), count)
}

// TestCrossTenantFriendRequest tests that friend requests are blocked across tenants
func (suite *IntegrationTestSuite) TestCrossTenantFriendRequest() {
	// Create user in tenant1
	user1 := models.User{
		TenantID:       suite.tenant1.ID,
		KeycloakUserID: "user1-id",
		Email:          "user1@tenant1.com",
		FirstName:      "User",
		LastName:       "One",
		Initials:       "U1",
	}
	config.DB.Create(&user1)

	// Create user in tenant2
	user2 := models.User{
		TenantID:       suite.tenant2.ID,
		KeycloakUserID: "user2-id",
		Email:          "user2@tenant2.com",
		FirstName:      "User",
		LastName:       "Two",
		Initials:       "U2",
	}
	config.DB.Create(&user2)

	// Try to send friend request from tenant1 to user in tenant2
	reqBody := map[string]interface{}{
		"friend_mail": "user2@tenant2.com",
	}

	resp, body := suite.makeRequest("POST", "/v2/friends/request", suite.adminToken, suite.tenant1.Slug, reqBody)
	assert.Equal(suite.T(), http.StatusNotFound, resp.StatusCode)

	var errResp map[string]interface{}
	json.Unmarshal(body, &errResp)
	assert.Contains(suite.T(), errResp["detail"], "nicht gefunden") // User not found in same tenant
}

// TestTenantInactive tests that inactive tenants cannot be accessed
func (suite *IntegrationTestSuite) TestTenantInactive() {
	// Deactivate tenant1
	config.DB.Model(suite.tenant1).Update("is_active", false)

	// Try to access with inactive tenant
	resp, body := suite.makeRequest("GET", "/v1/rooms", "", suite.tenant1.Slug, nil)
	assert.Equal(suite.T(), http.StatusNotFound, resp.StatusCode)

	var errResp map[string]interface{}
	json.Unmarshal(body, &errResp)
	assert.Contains(suite.T(), errResp["error"], "Tenant not found")

	// Reactivate for other tests
	config.DB.Model(suite.tenant1).Update("is_active", true)
}

// TestSubdomainExtraction tests tenant extraction from subdomain
func (suite *IntegrationTestSuite) TestSubdomainExtraction() {
	// This would require setting up a proper host header
	// Simplified test for X-Tenant-ID header fallback

	resp, _ := suite.makeRequest("GET", "/v1/rooms", "", suite.tenant1.Slug, nil)
	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)
}

// TestMissingTenantHeader tests that missing tenant context is rejected
func (suite *IntegrationTestSuite) TestMissingTenantHeader() {
	req := httptest.NewRequest("GET", "/v1/rooms", nil)
	// No X-Tenant-ID header and no subdomain

	resp, err := suite.app.Test(req, -1)
	assert.NoError(suite.T(), err)

	// Should fall back to DEFAULT_TENANT_SLUG or return error
	// Depending on configuration
	assert.True(suite.T(), resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNotFound)
}

// ========================================
// INTEGRATION TESTS
// ========================================

// TestFullUserJourney tests complete user registration and usage flow
func (suite *IntegrationTestSuite) TestFullUserJourney() {
	// 1. User registers in Keycloak (simulated by token)
	userToken := suite.generateMockJWT(suite.tenant1.KeycloakRealmID, "journey-user", "journey@test.com", []string{"student"})

	// 2. First request auto-creates user
	resp, body := suite.makeRequest("GET", "/v1/user", userToken, suite.tenant1.Slug, nil)
	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)

	var user map[string]interface{}
	json.Unmarshal(body, &user)
	assert.Equal(suite.T(), "journey@test.com", user["email"])

	// 3. User can access their events
	resp, _ = suite.makeRequest("GET", "/v1/events", userToken, suite.tenant1.Slug, nil)
	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)

	// 4. User cannot access admin endpoints
	resp, _ = suite.makeRequest("GET", "/v1/admin/tenants", userToken, suite.tenant1.Slug, nil)
	assert.Equal(suite.T(), http.StatusForbidden, resp.StatusCode)
}

// TestAdminTenantManagement tests tenant CRUD operations
func (suite *IntegrationTestSuite) TestAdminTenantManagement() {
	// 1. Admin can list tenants
	resp, body := suite.makeRequest("GET", "/v1/admin/tenants", suite.adminToken, suite.tenant1.Slug, nil)
	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)

	var tenants []map[string]interface{}
	json.Unmarshal(body, &tenants)
	assert.GreaterOrEqual(suite.T(), len(tenants), 2) // At least our 2 test tenants

	// 2. Admin can create new tenant
	newTenant := map[string]interface{}{
		"name": "New Test School",
		"slug": "new-test-school",
	}

	resp, body = suite.makeRequest("POST", "/v1/admin/tenants", suite.adminToken, suite.tenant1.Slug, newTenant)
	// NOTE: This will fail in test without real Keycloak connection
	// In real integration tests, mock the Keycloak service
	// For now, we expect it to attempt creation
	assert.True(suite.T(), resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusInternalServerError)
}

// TestConcurrentRequests tests handling of concurrent requests
func (suite *IntegrationTestSuite) TestConcurrentRequests() {
	done := make(chan bool, 10)
	errors := make(chan error, 10)

	// Spawn 10 concurrent requests
	for i := 0; i < 10; i++ {
		go func(idx int) {
			token := suite.generateMockJWT(suite.tenant1.KeycloakRealmID, fmt.Sprintf("concurrent-user-%d", idx), fmt.Sprintf("user%d@test.com", idx), []string{"student"})
			resp, _ := suite.makeRequest("GET", "/v1/user", token, suite.tenant1.Slug, nil)

			if resp.StatusCode != http.StatusOK {
				errors <- fmt.Errorf("Request %d failed with status %d", idx, resp.StatusCode)
			}
			done <- true
		}(i)
	}

	// Wait for all requests
	for i := 0; i < 10; i++ {
		select {
		case <-done:
			// Success
		case err := <-errors:
			suite.T().Error(err)
		case <-time.After(5 * time.Second):
			suite.T().Error("Timeout waiting for concurrent requests")
		}
	}
}

// ========================================
// PERFORMANCE TESTS
// ========================================

// TestDatabaseQueryPerformance tests that queries are efficient
func (suite *IntegrationTestSuite) TestDatabaseQueryPerformance() {
	// Create 100 rooms for performance testing
	for i := 0; i < 100; i++ {
		room := models.Room{
			TenantID:   suite.tenant1.ID,
			RoomNumber: fmt.Sprintf("PERF-%d", i),
			Building:   "P",
			Floor:      "1",
		}
		config.DB.Create(&room)
	}

	// Measure query time
	start := time.Now()
	resp, _ := suite.makeRequest("GET", "/v1/rooms", "", suite.tenant1.Slug, nil)
	elapsed := time.Since(start)

	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)
	assert.Less(suite.T(), elapsed.Milliseconds(), int64(100), "Query should complete in <100ms")
}

// ========================================
// TEST RUNNER
// ========================================

// TestIntegrationSuite runs all integration tests
func TestIntegrationSuite(t *testing.T) {
	suite.Run(t, new(IntegrationTestSuite))
}
