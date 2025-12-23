package main

import (
	"io"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"

	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/handlers"
	"github.com/nora-nak/backend/middleware"
	"github.com/nora-nak/backend/services"
)

func main() {
	// Setup logging to file and console
	if err := setupLogging(); err != nil {
		log.Printf("WARNING: Failed to setup file logging: %v", err)
	}

	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load configuration
	config.LoadConfig()

	// Initialize database
	if err := config.InitDatabase(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer config.CloseDatabase()

	// Run migrations
	if err := config.AutoMigrate(); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Start scheduler (run immediately on startup)
	if err := services.StartScheduler(true); err != nil {
		log.Printf("WARNING: Failed to start scheduler: %v", err)
	}
	defer services.StopScheduler()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "NORA-NAK Stundenplan API v2.0.0",
		ErrorHandler: customErrorHandler,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))

	// Custom middleware to clean trailing slashes from Origin header BEFORE CORS
	app.Use(func(c *fiber.Ctx) error {
		// Get Origin header from request
		origin := c.Get("Origin")
		if origin != "" {
			// Remove all trailing slashes
			for len(origin) > 1 && origin[len(origin)-1] == '/' {
				origin = origin[:len(origin)-1]
			}
			c.Request().Header.Set("Origin", origin)
		}
		return c.Next()
	})

	// CORS Middleware - must be before routes (Allow all origins with credentials)
	app.Use(cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool {
			return true // Allow all origins
		},
		AllowHeaders:     "Content-Type,Authorization,Accept,Origin,User-Agent,Cache-Control,Pragma",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowCredentials: true,
		ExposeHeaders:    "Content-Length,Content-Type",
	}))

	// Public routes (no authentication)
	setupPublicRoutes(app)

	// Protected routes (requires authentication)
	setupProtectedRoutes(app)

	// Start server
	port := config.AppConfig.ServerPort
	log.Printf("Server starting on port %s", port)

	// Graceful shutdown
	go func() {
		if err := app.Listen(":" + port); err != nil {
			log.Fatal("Server failed to start:", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	if err := app.Shutdown(); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}

func setupPublicRoutes(app *fiber.App) {
	// Health check
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Redirect("https://nora-nak.de/dashboard", fiber.StatusMovedPermanently)
	})

	app.Get("/v1/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "NORA API is running",
			"version": "2.0.0",
		})
	})

	// App version for mobile apps
	app.Get("/v1/app-version", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"version":            "1.0.0",
			"required_version":   "1.0.0",
			"update_url_android": "https://play.google.com/store/apps/details?id=de.nora.nak",
			"update_url_ios":     "https://apps.apple.com/app/nora-stundenplan/id123456789",
		})
	})

	// NOTE: Login/Auth endpoints removed - Keycloak handles authentication
	// Old endpoints: /v1/login, /v1/verify, /v1/reset, etc.
	// Users now authenticate via Keycloak and receive JWT tokens

	// Public endpoints with tenant context (no auth required)
	publicTenant := app.Group("/v1", middleware.TenantMiddleware)
	publicTenant.Get("/rooms", handlers.GetRooms)
	publicTenant.Get("/room", handlers.GetRoomDetails)
	publicTenant.Get("/free-rooms", handlers.GetFreeRooms)
	publicTenant.Get("/view", handlers.ViewZenturieTimetable)
	publicTenant.Get("/subscription/:uuid", handlers.GetICSSubscription)
	publicTenant.Get("/all_zenturie", handlers.GetAllZenturien)
}

func setupProtectedRoutes(app *fiber.App) {
	// Protected group with new Keycloak auth middleware chain (v1)
	// 1. TenantMiddleware - Extract tenant from subdomain
	// 2. KeycloakAuthMiddleware - Validate JWT and auto-create user
	protected := app.Group("/v1",
		middleware.TenantMiddleware,
		middleware.KeycloakAuthMiddleware,
	)

	// User & Zenturie
	protected.Get("/user", handlers.GetUser)
	protected.Post("/zenturie", handlers.SetZenturie)
	protected.Get("/courses", handlers.GetCourses)

	// User Settings
	protected.Get("/user_settings", handlers.GetUserSettings)
	protected.Post("/user_settings", handlers.UpdateUserSettings)

	// Events & Timetables
	protected.Get("/events", handlers.GetEvents)
	protected.Get("/exams", handlers.GetExams)

	// Friends (v1 - deprecated, kept for backwards compatibility)
	var path = "/friends"
	protected.Get(path, handlers.GetFriends)
	protected.Post(path, handlers.AddFriend)
	protected.Delete(path, handlers.RemoveFriend)

	// Custom Hours
	protected.Post("/create", handlers.CreateCustomHour)
	protected.Post("/update", handlers.UpdateCustomHour)
	protected.Delete("/delete", handlers.DeleteCustomHour)

	// Exams
	protected.Post("/add", handlers.AddExam)

	// Search (with rate limiting)
	protected.Get("/search", middleware.SearchRateLimiter(), handlers.Search)

	// Scheduler status
	protected.Get("/scheduler/status", handlers.GetSchedulerStatus)

	// V2 Protected Routes (Keycloak auth)
	protectedV2 := app.Group("/v2",
		middleware.TenantMiddleware,
		middleware.KeycloakAuthMiddleware,
	)
	// Friends V2 (bidirectional friend requests)
	protectedV2.Post("/friends/request", middleware.FriendRequestRateLimiter(), handlers.SendFriendRequest)
	protectedV2.Get("/friends/requests", handlers.GetFriendRequests)
	protectedV2.Post("/friends/accept", handlers.AcceptFriendRequest)
	protectedV2.Post("/friends/reject", handlers.RejectFriendRequest)
	protectedV2.Delete("/friends/request", handlers.CancelFriendRequest)
	protectedV2.Get(path, handlers.GetFriendsV2)
	protectedV2.Delete(path, handlers.RemoveFriendV2)

	// Admin Routes (requires admin role)
	admin := protected.Group("/admin", middleware.RequireAdmin())
	admin.Post("/tenants", handlers.CreateTenant)
	admin.Get("/tenants", handlers.GetAllTenants)
	admin.Get("/tenants/:id", handlers.GetTenant)
	admin.Put("/tenants/:id", handlers.UpdateTenant)
	admin.Delete("/tenants/:id", handlers.DeleteTenant)
	admin.Get("/tenants/:id/stats", handlers.GetTenantStats)

	// Teacher Routes (requires teacher or admin role)
	teacher := protected.Group("/teacher", middleware.RequireRole("teacher", "admin"))
	// Future teacher-specific endpoints can be added here
	// Example: teacher.Post("/timetables", handlers.CreateTimetable)
	_ = teacher // Prevent unused variable warning
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}

	return c.Status(code).JSON(fiber.Map{
		"detail": err.Error(),
	})
}

// setupLogging configures logging to write to both console and file
func setupLogging() error {
	// Create logs directory if it doesn't exist
	logDir := "logs"
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return err
	}

	// Open log file
	logFile := filepath.Join(logDir, "backend_logs.log")
	file, err := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}

	// Create multi-writer to write to both console and file
	multiWriter := io.MultiWriter(os.Stdout, file)
	log.SetOutput(multiWriter)

	// Set log flags to include date and time
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

	log.Println("=============================================================")
	log.Println("Logging initialized - Writing to console and logs/backend_logs.log")
	log.Println("=============================================================")

	return nil
}
