# Dental Appointment Chatbot System - Design Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technologies Used](#technologies-used)
3. [Design Decisions and Rationale](#design-decisions-and-rationale)
4. [API Documentation](#api-documentation)
5. [Setup and Usage Instructions](#setup-and-usage-instructions)

## Architecture Overview

### System Architecture
The Dental Appointment Chatbot System follows a modern, microservices-inspired architecture with clear separation of concerns:

```
├── Frontend (Next.js App Router)
│   ├── Chat Interface
│   ├── Authentication Pages
│   └── Appointment Management
│
├── Backend Services
│   ├── Authentication Service
│   ├── Appointment Service
│   ├── Patient Service
│   ├── Chat Service
│   └── Email Service
│
└── External Services
    ├── Supabase (Database)
    ├── OpenAI (Chat Intelligence)
    └── SMTP (Email)
```

### Data Flow
1. User interacts with the chat interface
2. Chat service processes requests using AI
3. Backend services handle specific actions
4. Database operations are performed
5. Email notifications are sent
6. Results are returned to the user

## Technologies Used

### Frontend
- **Next.js 13+**
  - App Router for server-side rendering
  - API routes for backend functionality
  - Client-side state management
  - TailwindCSS for styling

### Backend
- **Supabase**
  - PostgreSQL database
  - Real-time capabilities
  - Row-level security
  - Authentication services

### Authentication
- **JWT (JSON Web Tokens)**
  - Stateless authentication
  - Secure token management
  - Email verification

### Email Service
- **Nodemailer**
  - SMTP integration
  - HTML email templates
  - Async email processing

### AI Integration
- **OpenAI API**
  - Natural language processing
  - Context-aware responses
  - Appointment flow management

## Design Decisions and Rationale

### 1. Next.js App Router
- **Decision**: Use Next.js App Router instead of Pages Router
- **Rationale**:
  - Better server-side rendering capabilities
  - Improved performance with streaming
  - Enhanced SEO capabilities
  - Better code organization

### 2. Supabase Integration
- **Decision**: Use Supabase over traditional databases
- **Rationale**:
  - Built-in authentication
  - Real-time capabilities
  - Simplified database operations
  - Excellent developer experience

### 3. Chat-First Interface
- **Decision**: Primary interaction through chat interface
- **Rationale**:
  - Natural user experience
  - Flexible interaction patterns
  - Easy to extend functionality
  - Reduced UI complexity

### 4. Email Notifications
- **Decision**: Comprehensive email notification system
- **Rationale**:
  - Important for medical appointments
  - Provides audit trail
  - Enhances user trust
  - Multiple touchpoints for critical actions

## API Documentation

### Authentication APIs
1. **POST /api/auth/register**
   - Register new user
   - Creates user account and patient profile

2. **POST /api/auth/signin**
   - Initiates sign-in process
   - Sends verification code

3. **POST /api/auth/verify**
   - Verifies email code
   - Issues JWT token

### Patient APIs
1. **GET /api/patients**
   - List all patients for user
   - Supports pagination

2. **POST /api/patients**
   - Add new patient
   - Family member management

3. **PUT /api/patients/[id]**
   - Update patient details
   - Modify relationships

### Appointment APIs
1. **GET /api/schedule/availableSlots**
   - List available appointment slots
   - Supports date range filtering

2. **POST /api/schedule/book**
   - Book single appointment
   - Handles validation and conflicts

3. **POST /api/schedule/book/family**
   - Book multiple consecutive appointments
   - Family booking coordination

4. **POST /api/schedule/emergency**
   - Handle emergency requests
   - Priority scheduling

### Chat API
1. **POST /api/chat**
   - Process chat messages
   - Handles context and actions
   - Integrates with OpenAI

## Setup and Usage Instructions

### Prerequisites
1. Node.js 18+ environment
2. Supabase account
3. Gmail account (for SMTP)
4. OpenAI API access

### Database Setup
1. Create Supabase project
2. Run schema migrations
3. Configure row-level security
4. Set up authentication

### Environment Configuration
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=
EMAIL_PASS=

# JWT
JWT_SECRET=

# OpenAI
OPENAI_API_KEY=
```

### Development Workflow
1. Clone repository
2. Install dependencies
3. Configure environment
4. Run development server
5. Access application

### Testing
- Unit tests for services
- Integration tests for APIs
- End-to-end testing for flows
- Manual testing checklist

### Deployment
1. Build application
2. Configure production environment
3. Deploy to hosting service
4. Monitor performance

## Security Considerations

### Authentication
- Email verification required
- JWT token expiration
- Secure cookie handling

### Data Protection
- Row-level security in database
- Input validation
- XSS prevention
- CSRF protection

### API Security
- Rate limiting
- Request validation
- Error handling
- Audit logging
