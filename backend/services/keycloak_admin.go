package services

import (
	"context"
	"fmt"
	"log"

	"github.com/Nerzal/gocloak/v13"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/models"
)

// KeycloakAdminService manages Keycloak realms and clients
type KeycloakAdminService struct {
	client        *gocloak.GoCloak
	adminUsername string
	adminPassword string
	masterRealm   string
}

// NewKeycloakAdminService creates a new Keycloak admin service
func NewKeycloakAdminService() *KeycloakAdminService {
	return &KeycloakAdminService{
		client:        gocloak.NewClient(config.AppConfig.KeycloakURL),
		adminUsername: config.AppConfig.KeycloakAdminUser,
		adminPassword: config.AppConfig.KeycloakAdminPassword,
		masterRealm:   config.AppConfig.KeycloakMasterRealm,
	}
}

// CreateTenantRealm creates a new Keycloak realm for a tenant with roles and client
func (s *KeycloakAdminService) CreateTenantRealm(ctx context.Context, tenant *models.Tenant) error {
	// Login as admin
	token, err := s.client.LoginAdmin(ctx, s.adminUsername, s.adminPassword, s.masterRealm)
	if err != nil {
		return fmt.Errorf("failed to login as admin: %w", err)
	}

	// Create realm
	realm := gocloak.RealmRepresentation{
		Realm:       gocloak.StringP(tenant.KeycloakRealmID),
		Enabled:     gocloak.BoolP(true),
		DisplayName: gocloak.StringP(tenant.Name),

		// User registration settings
		RegistrationAllowed:         gocloak.BoolP(true),
		RegistrationEmailAsUsername: gocloak.BoolP(true),
		LoginWithEmailAllowed:       gocloak.BoolP(true),

		// Password and email verification
		ResetPasswordAllowed: gocloak.BoolP(true),
		VerifyEmail:          gocloak.BoolP(true),
		EditUsernameAllowed:  gocloak.BoolP(false),

		// Token settings
		AccessTokenLifespan:                gocloak.IntP(300),     // 5 minutes
		SsoSessionIdleTimeout:              gocloak.IntP(1800),    // 30 minutes
		SsoSessionMaxLifespan:              gocloak.IntP(36000),   // 10 hours
		OfflineSessionIdleTimeout:          gocloak.IntP(2592000), // 30 days
		AccessTokenLifespanForImplicitFlow: gocloak.IntP(900),     // 15 minutes
	}

	_, err = s.client.CreateRealm(ctx, token.AccessToken, realm)
	if err != nil {
		return fmt.Errorf("failed to create realm: %w", err)
	}

	log.Printf("Created Keycloak realm: %s", tenant.KeycloakRealmID)

	// Create client for backend API
	if err := s.createRealmClient(ctx, token.AccessToken, tenant); err != nil {
		// Rollback: delete realm if client creation fails
		_ = s.client.DeleteRealm(ctx, token.AccessToken, tenant.KeycloakRealmID)
		return fmt.Errorf("failed to create client: %w", err)
	}

	// Create roles
	if err := s.createRealmRoles(ctx, token.AccessToken, tenant); err != nil {
		// Rollback: delete realm if role creation fails
		_ = s.client.DeleteRealm(ctx, token.AccessToken, tenant.KeycloakRealmID)
		return fmt.Errorf("failed to create roles: %w", err)
	}

	log.Printf("Successfully created tenant realm with client and roles: %s", tenant.KeycloakRealmID)
	return nil
}

// createRealmClient creates a client for the realm
func (s *KeycloakAdminService) createRealmClient(ctx context.Context, accessToken string, tenant *models.Tenant) error {
	clientID := tenant.KeycloakClientID
	redirectURIs := []string{
		fmt.Sprintf("https://%s.nora-nak.de/*", tenant.Slug),
		"http://localhost:3000/*",
		"http://localhost:5173/*", // Vite dev server
	}

	webOrigins := []string{
		fmt.Sprintf("https://%s.nora-nak.de", tenant.Slug),
		"http://localhost:3000",
		"http://localhost:5173",
	}

	client := gocloak.Client{
		ClientID:    gocloak.StringP(clientID),
		Name:        gocloak.StringP("NORA Backend Client"),
		Description: gocloak.StringP("Client for NORA backend API authentication"),
		Enabled:     gocloak.BoolP(true),

		// OAuth2 settings
		PublicClient:              gocloak.BoolP(false), // Confidential client
		DirectAccessGrantsEnabled: gocloak.BoolP(true),  // Allow direct grant (username/password)
		StandardFlowEnabled:       gocloak.BoolP(true),  // Allow authorization code flow
		ImplicitFlowEnabled:       gocloak.BoolP(false),
		ServiceAccountsEnabled:    gocloak.BoolP(false),

		// URLs
		RedirectURIs: &redirectURIs,
		WebOrigins:   &webOrigins,

		// Token settings
		FullScopeAllowed: gocloak.BoolP(true),
	}

	_, err := s.client.CreateClient(ctx, accessToken, tenant.KeycloakRealmID, client)
	if err != nil {
		return err
	}

	log.Printf("Created client '%s' in realm '%s'", clientID, tenant.KeycloakRealmID)
	return nil
}

// createRealmRoles creates custom roles for the realm
func (s *KeycloakAdminService) createRealmRoles(ctx context.Context, accessToken string, tenant *models.Tenant) error {
	roles := []struct {
		Name        string
		Description string
	}{
		{
			Name:        "admin",
			Description: "Administrator with full access to tenant management and configuration",
		},
		{
			Name:        "teacher",
			Description: "Teacher/instructor with access to course management and student data",
		},
		{
			Name:        "student",
			Description: "Student with access to own timetable, exams, and personal data",
		},
		{
			Name:        "support",
			Description: "Support staff with read-only access to help users",
		},
	}

	for _, roleInfo := range roles {
		role := gocloak.Role{
			Name:        gocloak.StringP(roleInfo.Name),
			Description: gocloak.StringP(roleInfo.Description),
		}

		_, err := s.client.CreateRealmRole(ctx, accessToken, tenant.KeycloakRealmID, role)
		if err != nil {
			log.Printf("WARNING: Failed to create role '%s': %v", roleInfo.Name, err)
			// Continue with other roles even if one fails
		} else {
			log.Printf("Created role '%s' in realm '%s'", roleInfo.Name, tenant.KeycloakRealmID)
		}
	}

	return nil
}

// DeleteTenantRealm deletes a Keycloak realm
func (s *KeycloakAdminService) DeleteTenantRealm(ctx context.Context, realmID string) error {
	token, err := s.client.LoginAdmin(ctx, s.adminUsername, s.adminPassword, s.masterRealm)
	if err != nil {
		return fmt.Errorf("failed to login as admin: %w", err)
	}

	err = s.client.DeleteRealm(ctx, token.AccessToken, realmID)
	if err != nil {
		return fmt.Errorf("failed to delete realm: %w", err)
	}

	log.Printf("Deleted Keycloak realm: %s", realmID)
	return nil
}

// GetRealmInfo retrieves realm information
func (s *KeycloakAdminService) GetRealmInfo(ctx context.Context, realmID string) (*gocloak.RealmRepresentation, error) {
	token, err := s.client.LoginAdmin(ctx, s.adminUsername, s.adminPassword, s.masterRealm)
	if err != nil {
		return nil, fmt.Errorf("failed to login as admin: %w", err)
	}

	realm, err := s.client.GetRealm(ctx, token.AccessToken, realmID)
	if err != nil {
		return nil, fmt.Errorf("failed to get realm: %w", err)
	}

	return realm, nil
}

// AssignRoleToUser assigns a realm role to a user
func (s *KeycloakAdminService) AssignRoleToUser(ctx context.Context, realmID, userID, roleName string) error {
	token, err := s.client.LoginAdmin(ctx, s.adminUsername, s.adminPassword, s.masterRealm)
	if err != nil {
		return fmt.Errorf("failed to login as admin: %w", err)
	}

	// Get role
	role, err := s.client.GetRealmRole(ctx, token.AccessToken, realmID, roleName)
	if err != nil {
		return fmt.Errorf("failed to get role: %w", err)
	}

	// Assign role to user
	err = s.client.AddRealmRoleToUser(ctx, token.AccessToken, realmID, userID, []gocloak.Role{*role})
	if err != nil {
		return fmt.Errorf("failed to assign role: %w", err)
	}

	log.Printf("Assigned role '%s' to user '%s' in realm '%s'", roleName, userID, realmID)
	return nil
}
