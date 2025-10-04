# SkillX - Professional Career Services Platform

> A comprehensive Next.js application for professional resume writing, career consultation, and talent development services.

[![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC)](https://tailwindcss.com/)

## 🚀 Overview

SkillX is a modern, full-stack career services platform that connects professionals with expert resume writers, career consultants, and talent development specialists. Built with Next.js 15, TypeScript, and MongoDB Atlas, it provides a seamless experience for both clients and administrators.

### ✨ Key Features

- **🎯 Professional Resume Writing** - Expert-crafted resumes tailored to specific industries
- **💼 Career Consultation** - One-on-one guidance from experienced career professionals  
- **📝 Cover Letter Services** - Compelling cover letters that get noticed
- **🔗 LinkedIn Optimization** - Professional profile enhancement for maximum visibility
- **👥 Admin Dashboard** - Comprehensive order and client management system
- **💬 Real-time Messaging** - Direct communication between clients and assigned experts
- **📊 Analytics & Reporting** - Business insights and performance tracking
- **🔒 Role-based Access Control** - Secure authentication for clients, admins, and super admins

## 🏗️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Context** - State management for authentication

### Backend
- **Next.js API Routes** - Server-side API endpoints
- **MongoDB Atlas** - Cloud database solution
- **JWT Authentication** - Secure token-based auth
- **Mongoose** - MongoDB object modeling

### Infrastructure
- **Vercel** - Deployment and hosting platform
- **Cloudinary** (Ready) - File storage and management
- **Winston Logging** - Structured application logging

## 🚀 Quick Start

### Prerequisites

- Node.js 18.17+ 
- MongoDB Atlas account
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/InnoTechI/SkillX.git
cd SkillX
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.local.example .env.local
```

Configure your `.env.local`:
```env
# Database
MONGODB_URI=your_mongodb_atlas_connection_string

# Authentication
JWT_SECRET=your_super_secure_jwt_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

# Optional: File Upload
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

4. **Start development server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
SkillX/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (routes)/
│   │   │   ├── login/         # Authentication pages
│   │   │   ├── register/      # User registration
│   │   │   └── admin/         # Admin dashboard
│   │   │       ├── messages/  # Client communication
│   │   │       ├── orders/    # Order management
│   │   │       ├── payments/  # Payment processing
│   │   │       └── reports/   # Analytics & reports
│   │   ├── api/               # API Routes
│   │   │   ├── auth/         # Authentication endpoints
│   │   │   ├── orders/       # Order management API
│   │   │   ├── payments/     # Payment processing API
│   │   │   ├── chat/         # Messaging system API
│   │   │   └── analytics/    # Business analytics API
│   │   ├── globals.css       # Global styles
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Homepage
│   ├── components/           # React components
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   └── Footer.tsx
│   ├── contexts/            # React Context providers
│   │   └── AuthContext.tsx  # Authentication state
│   ├── lib/                 # Utility libraries
│   │   ├── auth.ts         # JWT utilities
│   │   ├── db.ts           # MongoDB connection
│   │   ├── http.ts         # HTTP client utilities
│   │   └── logging/        # Winston logger setup
│   └── models/             # Database models
│       ├── User.ts         # User schema
│       └── Order.ts        # Order schema
├── public/                 # Static assets
├── docs/                   # Documentation
├── scripts/               # Database utilities
└── postman/              # API testing collection
```

## 🔐 Authentication & Authorization

### User Roles

| Role | Access Level | Capabilities |
|------|-------------|--------------|
| **Client** | Basic | Place orders, communicate with assigned experts, track progress |
| **Admin** | Management | Manage assigned orders, process payments, handle client communication |
| **Super Admin** | Full Access | System-wide management, analytics, user administration |

### API Authentication

All protected endpoints require JWT tokens:

```javascript
// Headers for authenticated requests
{
  "Authorization": "Bearer your_jwt_token",
  "Content-Type": "application/json"
}
```

## 📡 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register-user
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Order Management

#### Create Order
```http
POST /api/orders
Authorization: Bearer token
Content-Type: application/json

{
  "serviceType": "resume_writing",
  "requirements": "Professional resume for software engineer role",
  "deadline": "2024-02-15T00:00:00.000Z",
  "pricing": {
    "basePrice": 199.99,
    "total": 199.99
  }
}
```

#### Get Orders
```http
GET /api/orders?page=1&limit=10&status=in_progress
Authorization: Bearer token
```

### Messaging System

#### Get Conversations
```http
GET /api/admin/messages
Authorization: Bearer admin_token
```

#### Send Message
```http
POST /api/chat
Authorization: Bearer token
Content-Type: application/json

{
  "orderId": "order_id",
  "content": "Hello, I have a question about my order",
  "sender": "client"
}
```

### Analytics (Admin Only)

#### Dashboard Analytics
```http
GET /api/analytics?startDate=2024-01-01&endDate=2024-02-01
Authorization: Bearer admin_token
```

## 🎨 Features In Detail

### Client Experience
- **Service Selection** - Choose from resume writing, career consultation, cover letters
- **Requirements Specification** - Detailed forms to capture client needs
- **Real-time Communication** - Direct messaging with assigned experts
- **Progress Tracking** - Live updates on order status and milestones
- **File Management** - Secure upload and download of documents

### Admin Dashboard
- **Order Management** - Complete order lifecycle management
- **Client Communication** - Centralized messaging system with all clients
- **Payment Processing** - Secure payment confirmation and refund handling
- **Analytics & Reports** - Business insights and performance metrics
- **User Management** - Client and admin account administration

### Business Logic
- **Smart Assignment** - Automatic order assignment to available experts
- **Role-based Filtering** - Admins see only their assigned conversations
- **Status Tracking** - Complete order lifecycle from creation to delivery
- **Quality Control** - Built-in revision and approval workflows

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database Management
node scripts/seed-db.js              # Seed sample data
node scripts/check-admin-assignments.js  # Verify admin assignments
```

### Database Scripts

The `scripts/` directory contains utilities for database management:

- **seed-db.js** - Populate database with sample data
- **check-admin-assignments.js** - Verify order assignments
- **fix-orphaned-orders.js** - Fix unassigned orders

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB Atlas connection string | ✅ |
| `JWT_SECRET` | JWT signing secret | ✅ |
| `JWT_REFRESH_SECRET` | Refresh token secret | ✅ |
| `CLOUDINARY_CLOUD_NAME` | File storage (optional) | ❌ |
| `NEXT_PUBLIC_APP_URL` | Application URL | ❌ |

## 🧪 Testing

### API Testing with Postman

A complete Postman collection is available at `postman/SkillX.postman_collection.json`:

1. Import the collection into Postman
2. Set up environment variables (baseUrl, authToken)
3. Run the complete test suite

### Manual Testing Checklist

- [ ] User registration and login
- [ ] Order creation and management  
- [ ] Admin assignment and filtering
- [ ] Real-time messaging system
- [ ] Payment processing workflows
- [ ] Analytics and reporting

## 📊 Business Analytics

The platform provides comprehensive business insights:

### Key Metrics
- **Order Volume** - Daily, weekly, monthly order trends
- **Revenue Tracking** - Income by service type and time period
- **Performance Metrics** - Completion rates and delivery times
- **Client Analytics** - Retention rates and satisfaction scores

### Admin Workload Distribution
- **Assignment Balance** - Equal distribution across available experts
- **Capacity Management** - Prevent admin overload
- **Performance Tracking** - Individual admin productivity metrics

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Connect Repository**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

2. **Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Ensure `MONGODB_URI` points to production database

3. **Domain Configuration**
   - Configure custom domain in Vercel settings
   - Update CORS settings if needed

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm run start
```

## � Security Features

### Authentication Security
- JWT tokens with configurable expiration
- Refresh token rotation for enhanced security
- Password hashing with bcrypt
- Account lockout after failed attempts

### Data Protection  
- Input validation and sanitization
- MongoDB injection prevention
- XSS protection
- CORS configuration
- Rate limiting on API endpoints

### Access Control
- Role-based permissions
- Resource-level authorization
- Admin assignment filtering
- Secure file upload validation

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Add tests** (if applicable)
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Code Style
- Follow TypeScript best practices
- Use Prettier for code formatting
- Write meaningful commit messages
- Add JSDoc comments for functions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support & Documentation

### Getting Help
- 📚 [API Documentation](./docs/API.md)
- 🐛 [Issue Tracker](https://github.com/InnoTechI/SkillX/issues)
- 💬 [Discussions](https://github.com/InnoTechI/SkillX/discussions)

### Additional Resources
- [Postman Collection](./postman/SkillX.postman_collection.json)
- [Database Schema](./docs/database-schema.md)
- [Deployment Guide](./docs/deployment.md)

---

**SkillX** - Empowering careers through professional services and expert guidance.

Built with ❤️ by [InnoTechI](https://github.com/InnoTechI)
