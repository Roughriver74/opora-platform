# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Что использовать

Для внутрениих вычеслений испольщзуй бекенд.

Для отрисовки данных - frontend.


## Project Overview

Beton CRM is a concrete order management system with Bitrix24 integration. It's a full-stack TypeScript application with React frontend and Node.js/Express backend, using PostgreSQL for data persistence.

**Architecture**: Client-Server architecture with separate React frontend and Express backend
**Database**: Migrated from MongoDB to PostgreSQL using TypeORM
**Authentication**: JWT-based with role-based access (user/admin)  
**External Integration**: Bitrix24 CRM for deal creation and data synchronization

## Current Status

✅ **System is FULLY OPERATIONAL** - All services running successfully
- Frontend (React + TypeScript) - http://localhost:3000
- Backend (Node.js/Express + TypeScript) - http://localhost:5001/api
- PostgreSQL Database - localhost:5489 (connected and stable)
- Redis Cache - localhost:6396 (active with AOF persistence)

✅ **Authentication Working** - JWT tokens, role-based access
✅ **Bitrix24 Integration Active** - Deal creation, contact sync, field mapping
✅ **Database Operations Stable** - TypeORM migrations, entity relationships
✅ **Caching Optimized** - Redis memory caching for Bitrix24 API calls

## Login Credentials

**Admin Access**:
- Email: crm@betonexpress.pro  
- Password: admin123

## Development Commands

**IMPORTANT**: This project runs entirely in Docker containers. Use the scripts in `/scripts` directory for all operations.

### Primary Docker Operations
```bash
# Production mode (recommended for development)
cd scripts
./start.sh            # Full rebuild and start all services (Frontend, Backend, PostgreSQL, Redis)
./stop.sh             # Stop all services  
./logs.sh             # View all logs
./logs.sh backend     # Backend logs only
./logs.sh frontend    # Frontend logs only

# Development mode with hot reload
./start-dev.sh        # Start with development containers and file watching
```

### Service Access
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **PostgreSQL**: localhost:5489
- **Redis**: localhost:6396

### Direct Container Commands (when needed)
```bash
# Run commands inside containers
docker compose exec backend npm run migration:run
docker compose exec backend npm run create-test-user
docker compose exec frontend npm test

# Database migrations (run inside backend container)
docker compose exec backend npm run migration:generate
docker compose exec backend npm run migration:run
docker compose exec backend npm run migration:revert

# Data migration utilities
docker compose exec backend npm run migrate:export
docker compose exec backend npm run migrate:transform  
docker compose exec backend npm run migrate:import
docker compose exec backend npm run migrate:all
```

### Testing
```bash
# Playwright E2E tests (run from project root)
npm test
npm run test:headed    # With browser UI
npm run test:ui        # Interactive test runner

# Container health checks
docker compose ps      # Check service status
```

## Architecture & Key Components

### Frontend Structure (`/client/src`)

**Pages & Routing**:
- `HomePage.tsx` - Public form for concrete orders
- `admin/` - Administrative interface (forms, users, settings)

**Core Components**:
- `form/BetoneForm/` - Dynamic form system with section/field management
- `admin/FormEditor/` - Drag-and-drop form builder with advanced field types
- `admin/Users/` - User management with role-based access
- `components/auth/` - Authentication system with private routes

**State Management**:
- React Query (`@tanstack/react-query`) for server state
- Context API for authentication and notifications
- Custom hooks for component logic

**Form System Architecture**:
- Dynamic field types: text, select, checkbox, radio, date, autocomplete
- Linked fields with auto-population from Bitrix24
- Section-based organization with drag-and-drop reordering
- Mobile-responsive with collapsible sections

### Backend Structure (`/server/src`)

**Database Layer** (TypeORM):
- `entities/` - Database entities with base auditable properties
- `repositories/` - Custom repository patterns extending TypeORM
- `migrations/` - Database schema and data migration scripts

**API Layer**:
- `controllers/` - Request/response handling
- `routes/` - Express route definitions
- `services/` - Business logic and external integrations
- `middleware/` - Authentication, authorization, validation

**Key Services**:
- `bitrix24Service.ts` - Bitrix24 API integration for deals/contacts (with Redis caching)
- `SubmissionService.ts` - Form submission processing and validation
- `UserService.ts` - User management with password hashing  
- `FormService.ts` - Dynamic form configuration management
- `CacheService.ts` - Redis-based caching layer for API optimization

### Database Entities

**Core Entities**:
- `User` - System users with roles (user/admin)
- `Form` - Form configurations with metadata
- `FormField` - Dynamic form fields with types and validation
- `Submission` - User form submissions linked to Bitrix24 deals
- `Settings` - System-wide configuration

**Entity Relationships**:
- Forms have many FormFields (with ordering)
- Users have many Submissions
- Submissions reference Forms and include Bitrix24 deal IDs
- All entities extend AuditableEntity (created/updated timestamps)

## Common Development Patterns

### Form Field Types
When adding new field types, update:
1. `FormField.entity.ts` - Field type enum
2. `client/src/components/form/FormField/` - Render component
3. `client/src/components/admin/FormEditor/` - Editor components
4. Validation logic in both frontend and backend

### API Integration
- All API calls use axios with interceptors for auth tokens
- Backend uses JWT middleware for protected routes
- Bitrix24 integration handles deal creation and data synchronization
- Error responses include structured error messages

### Database Operations
- Use TypeORM repositories for database operations
- All entities include audit timestamps
- Migrations handle both schema and data changes
- Relationships use proper foreign key constraints

## Environment Configuration

### Required Environment Variables

**Server** (`/server/.env`):
```
PORT=5001
DB_HOST=localhost
DB_PORT=5489
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=beton_crm
BITRIX24_WEBHOOK_URL=https://your-domain.bitrix24.ru/rest/user_id/webhook_key/
JWT_SECRET=your-jwt-secret
REDIS_URL=redis://localhost:6396
```

**Client** (`/client/.env`):
```
REACT_APP_API_URL=http://localhost:5001/api
```

## Testing & Deployment

### Testing Strategy
- Playwright for E2E testing (authentication, form submission, admin features)
- Jest for React component testing
- API endpoint testing through Playwright
- Database integrity validation scripts

### Production Deployment
- Uses Docker containers with multi-stage builds
- PostgreSQL and Redis as external services
- Nginx for frontend static file serving
- Health checks and monitoring via diagnostic endpoints

## Key Development Notes

### Database Migration
The project was migrated from MongoDB to PostgreSQL. Migration scripts are preserved in `/server/src/database/migrations/scripts/` for reference.

### Bitrix24 Integration
- Webhook-based integration for creating deals and contacts
- Field mapping between form fields and Bitrix24 custom fields
- Auto-population of dropdowns from Bitrix24 catalog items
- Status synchronization for submissions

### Mobile Optimization
Forms are optimized for mobile with:
- Responsive section layout
- Touch-friendly interactions
- Progressive disclosure of form sections
- Mobile-specific validation and error handling

### Performance Optimizations
- **Redis Caching**: Bitrix24 API responses cached for faster load times
- **Memory Optimization**: Efficient data structures and query optimization
- **Background Processing**: Non-blocking operations for form submissions
- **Connection Pooling**: PostgreSQL connection management
- **AOF Persistence**: Redis data durability with append-only file