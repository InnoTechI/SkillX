# SkillX Admin Backend

A comprehensive, enterprise-grade backend API system for managing a resume-writing service business. This system provides complete order management, client communication, payment processing, file handling, revision tracking, and analytics capabilities.

## 🚀 Features

### Core Business Operations
- **Order Management** - Complete order lifecycle from creation to delivery
- **Payment Processing** - Secure payment handling with confirmation and refund capabilities
- **File Management** - Cloudinary-integrated file storage with version control
- **Revision System** - Comprehensive revision request and tracking system
- **Client Communication** - Real-time chat system between clients and admins
- **Analytics & Reporting** - Business insights and performance metrics

### Security & Enterprise Features
- **Role-based Authentication** - JWT-based auth with client/admin/super_admin roles
- **Comprehensive Validation** - Input validation and sanitization at every level
- **Enterprise Logging** - Structured logging with Winston for audit trails
- **Rate Limiting** - API protection with configurable limits
- **Data Security** - MongoDB sanitization, XSS protection, and secure headers

## 📚 API Documentation

### Authentication Endpoints

#### Register Admin
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "admin@skillx.com",
  "password": "SecurePassword123!",
  "role": "admin"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@skillx.com",
  "password": "SecurePassword123!"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

### Order Management

#### Create Order
```http
POST /api/orders
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "client": "client_user_id",
  "serviceType": "professional_resume",
  "requirements": {
    "targetRole": "Software Engineer",
    "industry": "Technology",
    "experienceLevel": "mid_level",
    "additionalServices": ["cover_letter", "linkedin_optimization"]
  },
  "pricing": {
    "basePrice": 199.99,
    "additionalServicesPricing": 49.99,
    "total": 249.98
  },
  "timeline": {
    "deadline": "2024-02-15T00:00:00.000Z",
    "estimatedCompletion": "2024-02-10T00:00:00.000Z"
  }
}
```

#### Get All Orders
```http
GET /api/orders?page=1&limit=10&status=pending&serviceType=professional_resume
Authorization: Bearer your_jwt_token
```

#### Update Order Status
```http
PUT /api/orders/:orderId/status
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "status": "in_progress",
  "note": "Started working on the resume"
}
```

#### Assign Order to Admin
```http
PUT /api/orders/:orderId/assign
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "adminId": "admin_user_id",
  "note": "Assigned to specialist"
}
```

### Payment Management

#### Get All Payments
```http
GET /api/payments?page=1&limit=10&status=pending&paymentMethod=stripe
Authorization: Bearer your_jwt_token
```

#### Confirm Payment
```http
PUT /api/payments/:paymentId/confirm
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "confirmationDetails": {
    "transactionId": "txn_1234567890",
    "gateway": "stripe",
    "amount": 249.98
  },
  "adminNote": "Payment verified and confirmed"
}
```

#### Process Refund
```http
POST /api/payments/:paymentId/refund
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "amount": 249.98,
  "reason": "client_cancellation",
  "description": "Full refund due to client request"
}
```

### File Management

#### Upload Files
```http
POST /api/orders/:orderId/files
Authorization: Bearer your_jwt_token
Content-Type: multipart/form-data

files: [file1.pdf, file2.docx]
fileType: "resume"
description: "Initial resume drafts"
visibility: "order_specific"
tags: ["draft", "version1"]
```

#### Get Files
```http
GET /api/files?page=1&limit=10&fileType=resume&orderId=order_id
Authorization: Bearer your_jwt_token
```

#### Download File
```http
GET /api/files/:fileId/download
Authorization: Bearer your_jwt_token
```

### Revision Management

#### Create Revision Request
```http
POST /api/revisions
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "order": "order_id",
  "type": "content",
  "priority": "high",
  "urgencyLevel": "express",
  "requestDetails": {
    "description": "Please update the experience section to highlight leadership skills",
    "specificChanges": [
      "Add quantified achievements",
      "Emphasize team management experience"
    ]
  },
  "timeline": {
    "preferredDeadline": "2024-02-20T00:00:00.000Z"
  }
}
```

#### Get All Revisions
```http
GET /api/revisions?page=1&limit=10&status=pending&priority=high
Authorization: Bearer your_jwt_token
```

#### Complete Revision
```http
PUT /api/revisions/:revisionId/complete
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "changesSummary": "Updated experience section with quantified achievements and leadership focus",
  "revisedFiles": ["file_id_1", "file_id_2"],
  "clientNotes": "Revision completed as requested"
}
```

### Chat & Communication

#### Get Chat Room for Order
```http
GET /api/orders/:orderId/chat
Authorization: Bearer your_jwt_token
```

#### Get Messages
```http
GET /api/orders/:orderId/messages?page=1&limit=50
Authorization: Bearer your_jwt_token
```

#### Send Message
```http
POST /api/orders/:orderId/messages
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "content": "Hello! I have a question about the resume format.",
  "messageType": "text",
  "priority": "normal",
  "isInternal": false
}
```

### Analytics & Reporting

#### Dashboard Analytics
```http
GET /api/analytics/dashboard?startDate=2024-01-01&endDate=2024-02-01
Authorization: Bearer your_jwt_token
```

#### Revenue Analytics
```http
GET /api/analytics/revenue?groupBy=month&serviceType=professional_resume
Authorization: Bearer your_jwt_token
```

#### Performance Metrics
```http
GET /api/analytics/performance?startDate=2024-01-01&endDate=2024-02-01
Authorization: Bearer your_jwt_token
```

#### Export Reports
```http
GET /api/analytics/reports/export?reportType=orders&format=json&startDate=2024-01-01
Authorization: Bearer your_jwt_token
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Cloudinary account for file storage

### Environment Configuration

Create a `.env` file in the backend directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/skillx_admin
DB_NAME=skillx_admin

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_key_here
JWT_REFRESH_EXPIRES_IN=7d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Security Configuration
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME_MINUTES=30

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=logs/app.log
LOG_ERROR_FILE_PATH=logs/error.log
```

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd SkillX/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB**
```bash
# Using MongoDB service
sudo systemctl start mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

5. **Start the development server**
```bash
npm run dev
```

The server will start on `http://localhost:5000`

### Production Deployment

For production deployment:

```bash
npm run build
npm start
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── middleware/          # Authentication, error handling, validation
│   │   ├── auth.js         # JWT authentication & authorization
│   │   └── errorHandler.js # Global error handling
│   ├── models/             # MongoDB schemas
│   │   ├── User.js         # User model with authentication
│   │   ├── Order.js        # Order management schema
│   │   ├── Payment.js      # Payment processing model
│   │   ├── File.js         # File management with Cloudinary
│   │   ├── Revision.js     # Revision tracking system
│   │   └── Chat.js         # Real-time communication
│   ├── routes/             # API endpoints
│   │   ├── auth.js         # Authentication routes
│   │   ├── orders.js       # Order management API
│   │   ├── payments.js     # Payment processing API
│   │   ├── revisions.js    # Revision management API
│   │   ├── files.js        # File handling API
│   │   ├── chat.js         # Communication API
│   │   └── analytics.js    # Analytics & reporting API
│   ├── utils/              # Utility modules
│   │   ├── logger.js       # Winston logging configuration
│   │   ├── validators.js   # Input validation & sanitization
│   │   └── cloudinary.js   # File upload utilities
│   └── server.js           # Main application entry point
├── package.json            # Dependencies and scripts
└── .env.example           # Environment configuration template
```

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (client/admin/super_admin)
- Account lockout after failed login attempts
- Password strength validation and hashing

### Data Protection
- MongoDB injection prevention
- XSS protection with input sanitization
- CORS configuration for cross-origin requests
- HTTP Parameter Pollution prevention
- Secure HTTP headers with Helmet.js

### API Security
- Rate limiting to prevent abuse
- Request size limiting
- Input validation on all endpoints
- Comprehensive error handling without information leakage

## 📊 Business Logic

### Order Workflow
1. **Order Creation** - Client creates order with requirements
2. **Admin Assignment** - Orders assigned to available admins
3. **Work in Progress** - Admin works on the order deliverables
4. **Client Review** - Completed work sent for client review
5. **Revisions** - Handle client feedback and revision requests
6. **Final Delivery** - Order marked as completed and delivered

### Payment Processing
- Secure payment confirmation by admins
- Comprehensive refund handling
- Payment audit trails and history
- Integration-ready for payment gateways

### File Management
- Secure file upload with type validation
- Version control for file revisions
- Access control based on user roles
- Cloudinary integration for scalable storage

## 🚀 Performance & Scaling

### Database Optimization
- Indexed fields for faster queries
- Pagination for large datasets
- Efficient aggregation pipelines for analytics
- Connection pooling and optimization

### Caching Strategy
- Ready for Redis integration
- Response caching for analytics endpoints
- File metadata caching
- Session management optimization

### Monitoring & Logging
- Comprehensive business event logging
- Error tracking and alerting
- Performance metrics collection
- Request/response logging for debugging

## 🧪 Testing

The system is built with testing in mind:

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm run test:auth
npm run test:orders
npm run test:payments
```

## 📈 Analytics & Insights

The system provides comprehensive business analytics:

- **Revenue Analytics** - Track income by service type, time period, and admin
- **Performance Metrics** - Completion rates, quality scores, delivery times
- **Client Analytics** - Segmentation, retention, lifetime value
- **Operational Insights** - Workload distribution, revision patterns

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | localhost:27017 |
| `JWT_SECRET` | JWT signing secret | required |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary configuration | required |
| `LOG_LEVEL` | Logging level | info |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit per window | 100 |

### Role Permissions

| Role | Permissions |
|------|-------------|
| `client` | View own orders, send messages, request revisions |
| `admin` | Manage assigned orders, process payments, handle revisions |
| `super_admin` | Full system access, analytics, user management |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Email: support@skillx.com
- Documentation: [API Documentation](./docs/api.md)

---

**SkillX Admin Backend** - Enterprise-grade resume service management system built with Node.js, MongoDB, and modern security practices.
