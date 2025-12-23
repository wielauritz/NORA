# NORA Backend - Integration & Security Tests

## 📋 Übersicht

Dieses Verzeichnis enthält umfassende Integration- und Sicherheitstests für das NORA Backend mit Keycloak Multi-Tenancy.

**Test-Kategorien:**
1. **Security Tests** - Tenant-Isolation, JWT-Validierung, RBAC
2. **Integration Tests** - End-to-End User Journeys, Tenant Management
3. **Performance Tests** - Query-Performance, Concurrent Requests

---

## 🚀 Tests ausführen

### Voraussetzungen

1. **Go 1.21+** installiert
2. **PostgreSQL 14+** läuft
3. **Test-Datenbank** erstellen:

```bash
# Als postgres user
createdb nora_test
createuser nora_user
psql -c "ALTER USER nora_user WITH PASSWORD 'password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE nora_test TO nora_user;"
```

### Dependencies installieren

```bash
cd backend
go mod download

# Testify framework installieren (falls nicht vorhanden)
go get github.com/stretchr/testify/assert
go get github.com/stretchr/testify/suite
```

### Alle Tests ausführen

```bash
# Alle Tests
cd tests
go test -v

# Einzelne Test-Suite
go test -v -run TestIntegrationSuite

# Einzelner Test
go test -v -run TestIntegrationSuite/TestTenantIsolation_CrossTenantDataAccess
```

### Mit Coverage

```bash
go test -v -cover -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

---

## 📝 Test-Übersicht

### Security Tests

#### 1. Tenant-Isolation Tests

**TestTenantIsolation_CrossTenantDataAccess**
- Erstellt Daten für 2 Tenants
- Verifiziert, dass Tenant A nur eigene Daten sieht
- Verifiziert, dass Tenant B nur eigene Daten sieht
- ✅ **Erwartet:** Komplette Datenisolation zwischen Tenants

#### 2. JWT-Validierung Tests

**TestJWTValidation_ExpiredToken**
- Sendet abgelaufenen Token
- ✅ **Erwartet:** 401 Unauthorized

**TestJWTValidation_InvalidSignature**
- Sendet manipulierten Token
- ✅ **Erwartet:** 401 Unauthorized

**TestJWTValidation_MissingBearer**
- Sendet Token ohne "Bearer " Prefix
- ✅ **Erwartet:** 401 Unauthorized

**TestJWTValidation_WrongRealm**
- Sendet Token von Tenant A an Tenant B
- ✅ **Erwartet:** 401 Unauthorized (Issuer mismatch)

#### 3. Role-Based Access Control Tests

**TestRoleBasedAccess_AdminOnly**
- Admin kann Admin-Endpoints aufrufen
- Student/Teacher kann Admin-Endpoints NICHT aufrufen
- ✅ **Erwartet:** Admin: 200 OK, Student/Teacher: 403 Forbidden

**TestRoleBasedAccess_TeacherAccess**
- Verifiziert Teacher-spezifische Permissions
- ✅ **Erwartet:** Teacher kann Teacher-Endpoints aufrufen

#### 4. Cross-Tenant Security Tests

**TestCrossTenantFriendRequest**
- User von Tenant A versucht Freundschaftsanfrage an User von Tenant B
- ✅ **Erwartet:** 404 Not Found (User nicht im gleichen Tenant)

**TestTenantInactive**
- Deaktiviert Tenant
- Versucht Zugriff auf deaktivierten Tenant
- ✅ **Erwartet:** 404 Not Found

### Integration Tests

#### 5. User Journey Tests

**TestFullUserJourney**
- Simuliert komplette User-Registration und Nutzung
- 1. User registriert sich (simuliert durch Token)
- 2. Erste Request erstellt User automatisch
- 3. User kann eigene Events abrufen
- 4. User kann KEINE Admin-Endpoints aufrufen
- ✅ **Erwartet:** Kompletter Flow funktioniert

**TestUserAutoCreation**
- Neuer User sendet ersten Request
- ✅ **Erwartet:** User wird automatisch in DB erstellt

#### 6. Admin Tests

**TestAdminTenantManagement**
- Admin listet alle Tenants
- Admin erstellt neuen Tenant
- ✅ **Erwartet:** CRUD-Operations funktionieren

### Performance Tests

#### 7. Query Performance

**TestDatabaseQueryPerformance**
- Erstellt 100 Räume
- Misst Query-Zeit
- ✅ **Erwartet:** <100ms für Room-Liste

**TestConcurrentRequests**
- Sendet 10 parallele Requests
- ✅ **Erwartet:** Alle Requests erfolgreich, keine Race Conditions

---

## 🛠️ Test-Konfiguration

### Test-Datenbank

Die Tests verwenden eine separate Test-Datenbank (`nora_test`):

```go
config.AppConfig.DatabaseURL = "postgres://nora_user:password@localhost:5432/nora_test?sslmode=disable"
```

### Test-Setup

**SetupSuite (einmalig vor allen Tests):**
1. Datenbank initialisieren
2. Migrationen ausführen
3. Test-Tenants erstellen
4. Fiber App konfigurieren
5. Mock JWT-Tokens generieren

**SetupTest (vor jedem Test):**
1. User-Tabelle leeren
2. Timetable-Tabelle leeren
3. Custom Hours löschen
4. Friend Requests löschen

**TearDownSuite (nach allen Tests):**
1. Datenbank komplett löschen
2. Verbindung schließen

---

## 🔍 Mock JWT-Tokens

**WICHTIG:** Die aktuellen Tests verwenden vereinfachte Mock-Tokens:

```go
// Vereinfachtes Mock-Token
func generateMockJWT(realmID, userID, email string, roles []string) string {
    return fmt.Sprintf("MOCK_JWT_%s_%s_%s", realmID, userID, email)
}
```

**Für Production-Tests:**

Erstellen Sie echte JWTs mit Test-Schlüsseln:

```go
import (
    "github.com/golang-jwt/jwt/v5"
    "crypto/rsa"
)

func generateRealTestJWT(realmID, userID, email string, roles []string, privateKey *rsa.PrivateKey) string {
    claims := jwt.MapClaims{
        "sub":   userID,
        "email": email,
        "iss":   "https://keycloak.test.com/realms/" + realmID,
        "aud":   "nora-backend",
        "exp":   time.Now().Add(time.Hour).Unix(),
        "iat":   time.Now().Unix(),
        "realm_access": map[string]interface{}{
            "roles": roles,
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
    tokenString, _ := token.SignedString(privateKey)
    return tokenString
}
```

---

## 🧪 Neue Tests hinzufügen

### Test-Template

```go
// TestMyNewFeature tests my new feature
func (suite *IntegrationTestSuite) TestMyNewFeature() {
    // 1. Setup test data
    testData := createTestData()

    // 2. Make request
    resp, body := suite.makeRequest("GET", "/v1/my-endpoint", suite.adminToken, suite.tenant1.Slug, nil)

    // 3. Assertions
    assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)

    var response map[string]interface{}
    json.Unmarshal(body, &response)
    assert.Equal(suite.T(), "expected_value", response["field"])
}
```

### Helper-Funktionen nutzen

```go
// HTTP Request
resp, body := suite.makeRequest(method, path, token, tenantSlug, bodyData)

// Tenant-spezifische Daten erstellen
room := models.Room{
    TenantID:   suite.tenant1.ID,
    RoomNumber: "A101",
    ...
}
config.DB.Create(&room)
```

---

## 📊 Test-Metriken

### Erwartete Coverage

- **Middleware:** >90%
- **Handlers:** >80%
- **Models:** >70%
- **Services:** >85%

### Test-Laufzeit

- **Einzelner Test:** <1s
- **Alle Security Tests:** <5s
- **Alle Integration Tests:** <10s
- **Performance Tests:** <30s
- **Gesamt:** <1 Minute

---

## 🐛 Troubleshooting

### Problem: "no such database: nora_test"

**Lösung:**
```bash
createdb nora_test
psql -c "GRANT ALL PRIVILEGES ON DATABASE nora_test TO nora_user;"
```

### Problem: "connection refused"

**Lösung:**
```bash
# PostgreSQL starten
systemctl start postgresql
# Oder auf macOS:
brew services start postgresql
```

### Problem: Tests schlagen fehl mit "Keycloak connection error"

**Lösung:**
- Tests verwenden Mock-Tokens, kein echter Keycloak nötig
- Wenn echter Keycloak-Service getestet werden soll, mocken Sie `services.KeycloakAdminService`

### Problem: "duplicate key value violates unique constraint"

**Lösung:**
```bash
# Test-Datenbank komplett neu erstellen
dropdb nora_test
createdb nora_test
psql -c "GRANT ALL PRIVILEGES ON DATABASE nora_test TO nora_user;"
```

---

## 🔒 Security Test Checklist

Beim Hinzufügen neuer Features, prüfen Sie:

- [ ] Tenant-ID Filter in allen DB-Queries?
- [ ] JWT-Validierung für protected Endpoints?
- [ ] Role-Based Access Control implementiert?
- [ ] Cross-Tenant-Zugriff blockiert?
- [ ] Sensitive Daten nicht im Response (z.B. PasswordHash)?
- [ ] Input-Validierung (SQL-Injection, XSS)?
- [ ] Rate-Limiting für kritische Endpoints?

---

## 📚 Weitere Ressourcen

- **Testify Dokumentation:** https://github.com/stretchr/testify
- **Go Testing Best Practices:** https://go.dev/doc/tutorial/add-a-test
- **Table-Driven Tests:** https://dave.cheney.net/2019/05/07/prefer-table-driven-tests

---

## 📞 Support

Bei Problemen mit Tests:
1. Prüfen Sie Test-Datenbank-Verbindung
2. Prüfen Sie Test-Logs: `go test -v`
3. Debugging mit: `go test -v -run TestName`
4. Coverage-Report: `go tool cover -html=coverage.out`

**Viel Erfolg beim Testen! ✅**
