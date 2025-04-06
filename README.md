# Dental Appointment Chatbot System

## Introduction
The Dental Appointment Chatbot System is an intelligent, interactive platform designed to streamline the dental appointment booking process. Built with Next.js and integrated with AI capabilities, this system provides a conversational interface for patients to schedule appointments, manage their dental care, and handle emergency situations.

### Key Features
1. **Smart Appointment Booking**
   - Regular appointment scheduling
   - Family appointment booking
   - Emergency appointment requests
   - Real-time slot availability checking

2. **User Authentication**
   - Secure email-based verification
   - JWT-based session management
   - Protected patient information

3. **Patient Management**
   - Multiple patient profiles per account
   - Family appointment coordination
   - Patient history tracking

4. **Emergency Handling**
   - Urgent care request processing
   - Immediate notification system
   - Priority scheduling

5. **Email Notifications**
   - Appointment confirmations
   - Verification codes
   - Emergency request notifications
   - Family booking confirmations

## Setup Guide

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Gmail account for email notifications
- Supabase account for database

### Environment Variables
Create a `.env` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# Management Email
MANAGEMENT_EMAIL=dental_office_email

# Chat Settings (optional)
CHAT_CONTEXT_WINDOW_SIZE=20
```

### Installation

1. Clone the repository:
```bash
git clone <repository_url>
cd dental-registration
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up the database:
   - Create a new Supabase project
   - Run the database migrations (if any)
   - Update the environment variables with your Supabase credentials

4. Configure email:
   - Enable 2-factor authentication in your Gmail account
   - Generate an App Password
   - Update the email configuration in .env

### Running the Application

1. Start the development server:
```bash
npm run dev
# or
yarn dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

### Usage Flows

1. **Regular Appointment Booking**
   - User authenticates
   - Selects appointment type
   - Views available slots
   - Confirms booking
   - Receives email confirmation

2. **Family Appointment Booking**
   - User selects multiple family members
   - Chooses a common date
   - Books consecutive slots
   - Receives family booking confirmation

3. **Emergency Appointment**
   - User requests urgent care
   - System checks immediate availability
   - If no slots, sends emergency notification
   - Management team receives alert
   - Patient gets status updates

4. **Account Management**
   - Email verification
   - Profile updates
   - Family member management
   - Appointment history view

## Technologies Used
- Next.js 13+ (App Router)
- Supabase (Database)
- Node.js/Express
- JWT Authentication
- Nodemailer
- TailwindCSS
