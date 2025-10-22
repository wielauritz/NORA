package main

import (
	"log"
	"os"
	"os/signal"
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
		AllowOrigins:     "*",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS,PATCH",
		AllowHeaders:     "*",
		AllowCredentials: false, // Must be false with AllowOrigins: "*"
		ExposeHeaders:    "*",
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

	// Login Service
	app.Post("/v1/login", handlers.Login)
	app.Get("/v1/verify", handlers.VerifyEmail)
	app.Post("/v1/reset", handlers.RequestPasswordReset)
	app.Get("/v1/reset-password", handlers.ShowPasswordResetForm)
	app.Post("/v1/reset-confirm", handlers.ConfirmPasswordReset)
	app.Post("/v1/resend-email", handlers.ResendVerificationEmail)

	// Public endpoints (no auth required)
	app.Get("/v1/rooms", handlers.GetRooms)
	app.Get("/v1/room", handlers.GetRoomDetails)
	app.Get("/v1/free-rooms", handlers.GetFreeRooms)
	app.Get("/v1/view", handlers.ViewZenturieTimetable)
	app.Get("/v1/subscription/:uuid", handlers.GetICSSubscription)
	app.Get("/v1/all_zenturie", handlers.GetAllZenturien)
}

func setupProtectedRoutes(app *fiber.App) {
	// Protected group with auth middleware
	protected := app.Group("/v1", middleware.AuthMiddleware)

	// User & Zenturie
	protected.Get("/user", handlers.GetUser)
	protected.Post("/zenturie", handlers.SetZenturie)
	protected.Get("/courses", handlers.GetCourses)

	// Events & Timetables
	protected.Get("/events", handlers.GetEvents)
	protected.Get("/exams", handlers.GetExams)

	// Friends
	protected.Get("/friends", handlers.GetFriends)
	protected.Post("/friends", handlers.AddFriend)
	protected.Delete("/friends", handlers.RemoveFriend)

	// Custom Hours
	protected.Post("/create", handlers.CreateCustomHour)
	protected.Delete("/delete", handlers.DeleteCustomHour)

	// Exams
	protected.Post("/add", handlers.AddExam)

	// Search
	protected.Get("/search", handlers.Search)

	// Scheduler status
	protected.Get("/scheduler/status", handlers.GetSchedulerStatus)
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
