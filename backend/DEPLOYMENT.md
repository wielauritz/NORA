# NORA Backend - Production Deployment Guide

## ✅ Deployment Status: **LIVE & RUNNING**

### 🚀 Server Information
- **Server**: new.nora-nak.de
- **Backend Port**: 8000
- **Database**: PostgreSQL 16
- **Status**: ✅ Active & Running

---

## 📊 System Overview

### Backend Service
```bash
# Check status
systemctl status nora-backend

# View logs
journalctl -u nora-backend -f

# Restart service
systemctl restart nora-backend

# Stop service
systemctl stop nora-backend
```

### Database
```bash
# Connect to database
sudo -u postgres psql -d nora

# List tables
\dt

# View users
SELECT * FROM users;

# Backup database
pg_dump -U nora_user nora > nora_backup_$(date +%Y%m%d).sql
```

---

## 🔧 Configuration Files

### Backend Config
- **Location**: `/var/www/nora-production/backend/.env`
- **Binary**: `/var/www/nora-production/backend/nora-backend`
- **Service**: `/etc/systemd/system/nora-backend.service`

### Nginx Reverse Proxy
- **API Config**: `/etc/nginx/sites-available/api.new.nora-nak.de`
- **Frontend Config**: `/etc/nginx/sites-available/new.nora-nak.de`
- **SSL Cert**: `/etc/letsencrypt/live/new.nora-nak.de/fullchain.pem`
- **Protocol**: TLSv1.2, TLSv1.3
- **API**: api.new.nora-nak.de → backend on port 8000
- **Frontend**: new.nora-nak.de → /var/www/nora-nak-demo/frontend

### Database Config
- **Host**: localhost
- **Port**: 5432
- **Database**: nora
- **User**: nora_user
- **Password**: *See .env file*

### SMTP Config
- **Server**: nora-nak.de
- **Port**: 465 (SSL/TLS)
- **Sender**: noreply@nora-nak.de
- **Password**: *See .env file*

---

## 📡 API Endpoints

### Base URL
```
https://api.new.nora-nak.de  (Production API - HTTPS enabled)
http://localhost:8000        (Direct backend access)
```

### Frontend URL
```
https://new.nora-nak.de      (Frontend - Ionic/Capacitor app)
```

### Health Check
```bash
# Production API endpoint
curl https://api.new.nora-nak.de/v1/health

# Local backend endpoint
curl http://localhost:8000/v1/health

# Response: {"message":"NORA API is running","version":"2.0.0"}
```

### Available Endpoints

#### Public Endpoints (No Auth)
```
GET  /                              → Redirect to dashboard
GET  /v1/health                     → Health check
POST /v1/login                      → User login
GET  /v1/verify?uuid=...            → Email verification
POST /v1/reset                      → Request password reset
GET  /v1/reset-password?uuid=...   → Password reset form
POST /v1/reset-confirm              → Confirm password reset
POST /v1/resend-email               → Resend verification email
GET  /v1/rooms                      → List all rooms
GET  /v1/room?room_number=...       → Room details
GET  /v1/free-rooms?start_time=...&end_time=... → Free rooms
GET  /v1/view?zenturie=...&date=... → View zenturie timetable
GET  /v1/subscription/:uuid.ics     → ICS calendar subscription
GET  /v1/all_zenturie               → List all zenturien
```

#### Protected Endpoints (Require session_id)
```
GET    /v1/user?session_id=...           → User info
POST   /v1/zenturie?session_id=...       → Set user zenturie
GET    /v1/courses?session_id=...        → List courses
GET    /v1/events?session_id=...&date=...→ Get events for date
GET    /v1/exams?session_id=...          → Get user exams
GET    /v1/friends?session_id=...        → List friends
POST   /v1/friends?session_id=...        → Add friend
DELETE /v1/friends?session_id=...&friend_user_id=... → Remove friend
POST   /v1/create?session_id=...         → Create custom hour
DELETE /v1/delete?session_id=...&custom_hour_id=... → Delete custom hour
POST   /v1/add?session_id=...            → Add exam
GET    /v1/search?session_id=...&parameter=... → Search
GET    /v1/scheduler/status?session_id=... → Scheduler status
```

---

## 🔒 Security Checklist

### ✅ Completed
- [x] PostgreSQL user with limited privileges
- [x] Password hashing (SHA256 + bcrypt)
- [x] Session-based authentication
- [x] CORS configured
- [x] Service runs with systemd
- [x] Auto-restart on failure

### ⚠️ TODO for Production
- [ ] **CRITICAL**: Change JWT_SECRET in .env
- [x] **CRITICAL**: Configure real SMTP server (nora-nak.de:465)
- [x] Set up HTTPS/SSL with Let's Encrypt (expires 2026-01-18)
- [x] Configure reverse proxy (nginx with TLSv1.3)
- [ ] Set up firewall rules
- [ ] Configure log rotation
- [ ] Set up automated backups
- [ ] Add rate limiting
- [ ] Monitor with Prometheus/Grafana

---

## 🚨 Troubleshooting

### Service won't start
```bash
# Check logs
journalctl -u nora-backend -n 100 --no-pager

# Check if port is in use
lsof -i :8000

# Check database connection
sudo -u postgres psql -d nora -c "SELECT 1;"
```

### Database issues
```bash
# Restart PostgreSQL
systemctl restart postgresql

# Check PostgreSQL logs
tail -f /var/log/postgresql/postgresql-16-main.log

# Reset database (CAUTION!)
sudo -u postgres psql -c "DROP DATABASE nora;"
sudo -u postgres psql -c "CREATE DATABASE nora;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nora TO nora_user;"
systemctl restart nora-backend
```

### Performance issues
```bash
# Check system resources
htop

# Check database connections
sudo -u postgres psql -d nora -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
sudo -u postgres psql -d nora -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

---

## 📈 Monitoring

### Service Health
```bash
# Check if running
systemctl is-active nora-backend

# Check memory usage
systemctl status nora-backend | grep Memory

# Check CPU usage
systemctl status nora-backend | grep CPU
```

### Database Stats
```bash
sudo -u postgres psql -d nora -c "
SELECT
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables;
"
```

---

## 🔄 Update Procedure

### Update Backend
```bash
cd /var/www/nora-production/backend

# Backup current binary
cp nora-backend nora-backend.backup

# Pull new code / copy new binary
# ... your deployment method ...

# Rebuild
go build -o nora-backend main.go

# Restart service
systemctl restart nora-backend

# Check status
systemctl status nora-backend
```

### Database Migration
```bash
# Migrations run automatically on startup
# Check logs to verify
journalctl -u nora-backend -n 50 | grep migration
```

---

## 📊 Current Database Schema

```
users
├── id (PK)
├── mail (unique)
├── password_hash
├── verified
├── uuid
├── reset_uuid
├── first_name
├── last_name
├── initials
├── zenturie_id (FK)
└── subscription_uuid

sessions
├── id (PK)
├── session_id (unique)
├── user_id (FK)
├── created_at
└── expiration_date

zenturies
├── id (PK)
├── name (unique)
└── year

courses
├── id (PK)
├── name
├── module_number (unique)
└── year

rooms
├── id (PK)
├── room_number (unique)
├── building
├── floor
└── room_name

timetables
├── id (PK)
├── zenturie_id (FK)
├── course_id (FK)
├── room_id (FK)
├── uid (unique)
├── summary
├── description
├── location
├── start_time
├── end_time
├── professor
├── course_type
├── course_code
├── color
└── border_color

custom_hours
├── id (PK)
├── user_id (FK)
├── title
├── description
├── start_time
├── end_time
├── room_id (FK)
└── custom_location

exams
├── id (PK)
├── course_id (FK)
├── user_id (FK)
├── start_time
├── duration
├── is_verified
└── room_id (FK)

friends
├── id (PK)
├── user_id1 (FK)
├── user_id2 (FK)
└── created_at
```

---

## 🎯 Next Steps

### Immediate
1. ✅ Backend is running
2. ✅ Database is configured
3. ⏳ Configure SMTP for emails
4. ⏳ Set up reverse proxy (nginx)
5. ⏳ Configure HTTPS

### Short-term
1. Import initial data (zenturien, courses, rooms)
2. Test all endpoints with Postman
3. Set up monitoring
4. Configure automated backups

### Long-term
1. Build Ionic/Capacitor frontend
2. Deploy frontend
3. Connect frontend to backend
4. User acceptance testing
5. Go live! 🚀

---

## 📞 Support

For issues or questions:
- Check logs: `journalctl -u nora-backend -f`
- Database issues: `sudo -u postgres psql -d nora`
- System status: `systemctl status nora-backend`

---

**Last Updated**: 2025-10-20
**Version**: 2.0.0
**Status**: ✅ Production Ready
