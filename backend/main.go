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

	// CORS Middleware - must be before routes
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "https://new.nora-nak.de,https://nora-nak.de,http://localhost:3000,http://localhost:5173",
		AllowHeaders:     "Content-Type,Authorization,Accept,Origin,User-Agent,Cache-Control,Pragma",
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

	// Login Service (with rate limiting)
	app.Post("/v1/login", middleware.LoginRateLimiter(), handlers.Login)
	app.Get("/v1/verify", handlers.VerifyEmail)
	app.Post("/v1/reset", middleware.PasswordResetRateLimiter(), handlers.RequestPasswordReset)
	app.Get("/v1/reset-password", handlers.ShowPasswordResetForm)
	app.Post("/v1/reset-confirm", handlers.ConfirmPasswordReset)
	app.Post("/v1/resend-email", middleware.ResendEmailRateLimiter(), handlers.ResendVerificationEmail)

	// Public endpoints (no auth required)
	app.Get("/v1/rooms", handlers.GetRooms)
	app.Get("/v1/room", handlers.GetRoomDetails)
	app.Get("/v1/free-rooms", handlers.GetFreeRooms)
	app.Get("/v1/view", handlers.ViewZenturieTimetable)
	app.Get("/v1/subscription/:uuid", handlers.GetICSSubscription)
	app.Get("/v1/all_zenturie", handlers.GetAllZenturien)
}

func setupProtectedRoutes(app *fiber.App) {
	// Protected group with auth middleware (v1)
	protected := app.Group("/v1", middleware.AuthMiddleware)

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
	protected.Get("/friends", handlers.GetFriends)
	protected.Post("/friends", handlers.AddFriend)
	protected.Delete("/friends", handlers.RemoveFriend)

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

	// V2 Protected Routes
	protectedV2 := app.Group("/v2", middleware.AuthMiddleware)

	// Friends V2 (bidirectional friend requests)
	protectedV2.Post("/friends/request", middleware.FriendRequestRateLimiter(), handlers.SendFriendRequest) // Send friend request (with rate limiting)
	protectedV2.Get("/friends/requests", handlers.GetFriendRequests)                                        // Get incoming/outgoing requests
	protectedV2.Post("/friends/accept", handlers.AcceptFriendRequest)                                       // Accept request
	protectedV2.Post("/friends/reject", handlers.RejectFriendRequest)                                       // Reject request
	protectedV2.Delete("/friends/request", handlers.CancelFriendRequest)                                    // Cancel outgoing request
	protectedV2.Get("/friends", handlers.GetFriendsV2)                                                      // Get accepted friends
	protectedV2.Delete("/friends", handlers.RemoveFriendV2)                                                 // Remove friend
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
