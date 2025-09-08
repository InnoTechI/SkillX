# SkillX API Documentation

Base URL: `http://localhost:3000`

## Complete API Testing Sequence

### Prerequisites
1. Start your server: `npm run dev`
2. Ensure MongoDB is connected
3. Use Postman or similar API testing tool

---

## Step-by-Step Testing Guide

### 1. Health Check
- **Method:** GET
- **URL:** `/api/health`
- **Headers:** None
- **Body:** None
- **Expected:** Status 200 with server info

---

### 2. Register Admin (First time only)
- **Method:** POST
- **URL:** `/api/auth/register-admin`
- **Headers:** `Content-Type: application/json`
- **Description:** Creates the first admin user. First registered admin becomes super_admin, subsequent ones become admin.
- **Body:**
```json
{
  "email": "admin@skillx.com",
  "password": "Admin123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "1234567890"
}
```
- **Response (201 Success):**
```json
{
  "success": true,
  "message": "Admin registered successfully",
  "data": {
    "user": {
      "id": "64f8b2c3d1e5f6789abcdef0",
      "email": "admin@skillx.com",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "role": "super_admin",
      "isEmailVerified": true,
      "createdAt": "2025-09-08T10:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "7d"
    }
  }
}
```
- **Response (400 Error):**
```json
{
  "success": false,
  "message": "User with this email already exists",
  "error": "USER_ALREADY_EXISTS"
}
```

---

### 3. Admin Login (Get tokens)
- **Method:** POST
- **URL:** `/api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Description:** Authenticates admin users and returns access/refresh tokens. Only admin and super_admin roles can login.
- **Body:**
```json
{
  "email": "admin@skillx.com",
  "password": "Admin123!"
}
```
- **Response (200 Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "64f8b2c3d1e5f6789abcdef0",
      "email": "admin@skillx.com",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "role": "super_admin"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "7d"
    }
  }
}
```
- **Response (401 Error):**
```json
{
  "success": false,
  "message": "Invalid email or password",
  "error": "INVALID_CREDENTIALS"
}
```
- **Response (403 Error):**
```json
{
  "success": false,
  "message": "Access denied. Admin privileges required.",
  "error": "INSUFFICIENT_PRIVILEGES"
}
```
- **⚠️ Save the `accessToken` and `refreshToken` from response**

---

### 4. User Details
- **Method:** GET
- **URL:** `/api/user/details`
- **Headers:** `Authorization: Bearer {accessToken}`
- **Description:** Returns authenticated user's profile information (excluding sensitive data like password).
- **Body:** None
- **Response (200 Success):**
```json
{
  "success": true,
  "message": "User details retrieved successfully",
  "data": {
    "user": {
      "id": "64f8b2c3d1e5f6789abcdef0",
      "email": "admin@skillx.com",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "role": "super_admin",
      "phone": "1234567890",
      "isEmailVerified": true,
      "isActive": true,
      "createdAt": "2025-09-08T10:30:00.000Z",
      "updatedAt": "2025-09-08T10:30:00.000Z"
    }
  }
}
```
- **Response (401 Error):**
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "NOT_AUTHENTICATED"
}
```

---

### 5. Token Refresh
- **Method:** POST
- **URL:** `/api/user/token`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "refreshToken": "{refreshToken_from_login}"
}
```
- **Expected:** Status 200 with new tokens

---

### 6. Create Order
- **Method:** POST
- **URL:** `/api/orders`
- **Headers:** 
  - `Authorization: Bearer {accessToken}`
  - `Content-Type: application/json`
- **Description:** Creates a new service order. Auto-generates order number and sets estimated completion based on urgency.
- **Body:**
```json
{
  "serviceType": "resume_writing",
  "urgencyLevel": "standard",
  "requirements": {
    "industryType": "Technology",
    "experienceLevel": "mid_level",
    "targetRole": "Software Engineer",
    "specialRequests": "Please focus on technical skills and include GitHub projects",
    "atsOptimization": true,
    "keywords": ["JavaScript", "React", "Node.js", "MongoDB", "TypeScript"]
  },
  "pricing": {
    "basePrice": 150,
    "urgencyFee": 0,
    "additionalServices": [
      {
        "name": "LinkedIn Optimization",
        "price": 50
      }
    ],
    "discount": 10,
    "totalAmount": 180,
    "currency": "USD"
  }
}
```
- **Service Types:** `resume_writing`, `cv_writing`, `cover_letter`, `linkedin_optimization`, `resume_review`, `career_consultation`, `package_deal`
- **Urgency Levels:** `standard` (7 days), `urgent` (3 days), `express` (1 day)
- **Experience Levels:** `entry_level`, `mid_level`, `senior_level`, `executive`
- **Response (201 Success):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "_id": "64f8b2c3d1e5f6789abcdef1",
      "orderNumber": "SKX-20250908-1234",
      "client": {
        "_id": "64f8b2c3d1e5f6789abcdef0",
        "firstName": "John",
        "lastName": "Doe",
        "email": "admin@skillx.com"
      },
      "serviceType": "resume_writing",
      "urgencyLevel": "standard",
      "status": "pending",
      "priority": 3,
      "requirements": {
        "industryType": "Technology",
        "experienceLevel": "mid_level",
        "targetRole": "Software Engineer",
        "specialRequests": "Please focus on technical skills and include GitHub projects",
        "atsOptimization": true,
        "keywords": ["JavaScript", "React", "Node.js", "MongoDB", "TypeScript"]
      },
      "pricing": {
        "basePrice": 150,
        "urgencyFee": 0,
        "additionalServices": [
          {
            "name": "LinkedIn Optimization",
            "price": 50
          }
        ],
        "discount": 10,
        "totalAmount": 180,
        "currency": "USD"
      },
      "timeline": {
        "estimatedCompletion": "2025-09-15T10:30:00.000Z",
        "lastActivity": "2025-09-08T10:30:00.000Z"
      },
      "createdAt": "2025-09-08T10:30:00.000Z"
    }
  }
}
```
- **⚠️ Save the `_id` from response as `orderId` for subsequent requests**

---

### 7. List Orders
- **Method:** GET
- **URL:** `/api/orders?page=1&limit=10`
- **Headers:** `Authorization: Bearer {accessToken}`
- **Body:** None
- **Expected:** Status 200 with orders list

---

### 8. Order Details
- **Method:** GET
- **URL:** `/api/orders/{orderId}`
- **Headers:** `Authorization: Bearer {accessToken}`
- **Body:** None
- **Expected:** Status 200 with order details

---

### 9. Analytics (Admin only)
- **Method:** GET
- **URL:** `/api/analytics`
- **Headers:** `Authorization: Bearer {accessToken}`
- **Description:** Returns comprehensive analytics data including user statistics, order metrics, and revenue information.
- **Body:** None
- **Response (200 Success):**
```json
{
  "success": true,
  "message": "Analytics data retrieved successfully",
  "data": {
    "overview": {
      "totalUsers": 5,
      "activeUsers": 4,
      "totalOrders": 12,
      "totalRevenue": 2150.50,
      "averageOrderValue": 179.21
    },
    "recentOrders": [
      {
        "_id": "64f8b2c3d1e5f6789abcdef1",
        "orderNumber": "SKX-20250908-1234",
        "serviceType": "resume_writing",
        "status": "pending",
        "totalAmount": 180,
        "createdAt": "2025-09-08T10:30:00.000Z",
        "client": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "admin@skillx.com"
        }
      }
    ],
    "statusBreakdown": [
      { "_id": "pending", "count": 3 },
      { "_id": "in_progress", "count": 5 },
      { "_id": "completed", "count": 4 }
    ],
    "serviceBreakdown": [
      {
        "_id": "resume_writing",
        "count": 7,
        "revenue": 1200.50
      },
      {
        "_id": "cover_letter",
        "count": 3,
        "revenue": 450.00
      }
    ]
  }
}
```
- **Response (403 Error):**
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "error": "INSUFFICIENT_PERMISSIONS"
}
```

---

### 10. Send Chat Message
- **Method:** POST
- **URL:** `/api/chat`
- **Headers:** 
  - `Authorization: Bearer {accessToken}`
  - `Content-Type: application/json`
- **Body:**
```json
{
  "orderId": "{orderId}",
  "message": "Hello, I have a question about my order."
}
```
- **Expected:** Status 201 with message data

---

### 11. Get Chat Messages
- **Method:** GET
- **URL:** `/api/chat?orderId={orderId}&page=1&limit=20`
- **Headers:** `Authorization: Bearer {accessToken}`
- **Body:** None
- **Expected:** Status 200 with chat messages

---

### 12. Upload File (Simulated)
- **Method:** POST
- **URL:** `/api/files`
- **Headers:** 
  - `Authorization: Bearer {accessToken}`
  - `Content-Type: application/json`
- **Body:**
```json
{
  "filename": "resume_v1.pdf",
  "originalName": "My Resume.pdf",
  "mimeType": "application/pdf",
  "size": 1024000,
  "orderId": "{orderId}",
  "isPublic": false
}
```
- **Expected:** Status 201 with file data

---

### 13. Get Files
- **Method:** GET
- **URL:** `/api/files?orderId={orderId}&page=1&limit=10`
- **Headers:** `Authorization: Bearer {accessToken}`
- **Body:** None
- **Expected:** Status 200 with files list

---

### 14. Create Payment
- **Method:** POST
- **URL:** `/api/payments`
- **Headers:** 
  - `Authorization: Bearer {accessToken}`
  - `Content-Type: application/json`
- **Description:** Initiates a payment for an order. Simulates payment processing with random success/failure.
- **Body:**
```json
{
  "orderId": "{orderId}",
  "paymentMethod": "credit_card",
  "amount": 150
}
```
- **Payment Methods:** `credit_card`, `paypal`, `stripe`, `bank_transfer`
- **Response (201 Success):**
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "payment": {
      "id": "1694166600000",
      "orderId": "64f8b2c3d1e5f6789abcdef1",
      "orderNumber": "SKX-20250908-1234",
      "userId": "64f8b2c3d1e5f6789abcdef0",
      "amount": 150,
      "currency": "USD",
      "status": "pending",
      "paymentMethod": "credit_card",
      "transactionId": "txn_1694166600000",
      "createdAt": "2025-09-08T10:30:00.000Z",
      "updatedAt": "2025-09-08T10:30:00.000Z"
    }
  }
}
```
- **Response (404 Error):**
```json
{
  "success": false,
  "message": "Order not found",
  "error": "ORDER_NOT_FOUND"
}
```
- **Response (403 Error):**
```json
{
  "success": false,
  "message": "You can only make payments for your own orders",
  "error": "UNAUTHORIZED_PAYMENT"
}
```

---

### 15. Get Payments
- **Method:** GET
- **URL:** `/api/payments?page=1&limit=10&status=completed&orderId={orderId}`
- **Headers:** `Authorization: Bearer {accessToken}`
- **Description:** Retrieves payment history with filtering and pagination. Clients see only their payments, admins see all.
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
  - `status` (optional): Filter by status (`pending`, `processing`, `completed`, `failed`, `refunded`)
  - `orderId` (optional): Filter by specific order
- **Body:** None
- **Response (200 Success):**
```json
{
  "success": true,
  "message": "Payments retrieved successfully",
  "data": {
    "payments": [
      {
        "id": "1694166600000",
        "orderId": "64f8b2c3d1e5f6789abcdef1",
        "orderNumber": "SKX-20250908-1234",
        "userId": "64f8b2c3d1e5f6789abcdef0",
        "amount": 150,
        "currency": "USD",
        "status": "completed",
        "paymentMethod": "credit_card",
        "transactionId": "txn_1694166600000",
        "createdAt": "2025-09-08T10:30:00.000Z",
        "updatedAt": "2025-09-08T10:32:00.000Z"
      }
    ],
    "summary": {
      "totalAmount": 150,
      "totalPayments": 1,
      "statusBreakdown": {
        "completed": 1,
        "pending": 0,
        "failed": 0
      }
    },
    "pagination": {
      "currentPage": 1,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 16. Request Revision
- **Method:** POST
- **URL:** `/api/revisions`
- **Headers:** 
  - `Authorization: Bearer {accessToken}`
  - `Content-Type: application/json`
- **Description:** Requests a revision for an existing order. Auto-assigns revision number and estimated completion.
- **Body:**
```json
{
  "orderId": "{orderId}",
  "description": "Please add more technical skills section, update the summary to be more concise, and ensure ATS compatibility for tech companies",
  "priority": "medium"
}
```
- **Priority Levels:** 
  - `low` (3 days completion)
  - `medium` (2 days completion)
  - `high` (1 day completion)
- **Response (201 Success):**
```json
{
  "success": true,
  "message": "Revision requested successfully",
  "data": {
    "revision": {
      "id": "1694166600000",
      "orderId": "64f8b2c3d1e5f6789abcdef1",
      "orderNumber": "SKX-20250908-1234",
      "requestedBy": "64f8b2c3d1e5f6789abcdef0",
      "requesterName": "John Doe",
      "revisionNumber": 1,
      "status": "requested",
      "priority": "medium",
      "description": "Please add more technical skills section, update the summary to be more concise, and ensure ATS compatibility for tech companies",
      "estimatedCompletion": "2025-09-10T10:30:00.000Z",
      "createdAt": "2025-09-08T10:30:00.000Z",
      "updatedAt": "2025-09-08T10:30:00.000Z"
    }
  }
}
```
- **Response (404 Error):**
```json
{
  "success": false,
  "message": "Order not found",
  "error": "ORDER_NOT_FOUND"
}
```
- **Response (403 Error):**
```json
{
  "success": false,
  "message": "You can only request revisions for your own orders",
  "error": "UNAUTHORIZED_REVISION"
}
```

---

### 17. Get Revisions
- **Method:** GET
- **URL:** `/api/revisions?page=1&limit=10`
- **Headers:** `Authorization: Bearer {accessToken}`
- **Body:** None
- **Expected:** Status 200 with revisions list

---

### 18. Debug Users (Development only)
- **Method:** GET
- **URL:** `/api/debug/users`
- **Headers:** None
- **Body:** None
- **Expected:** Status 200 with user count and info

---

## API Endpoints Summary

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/health` | GET | No | Health check |
| `/api/auth/register-admin` | POST | No | Register admin user |
| `/api/auth/login` | POST | No | Admin login |
| `/api/user/details` | GET | Yes | Get user profile |
| `/api/user/token` | POST | No | Refresh access token |
| `/api/orders` | GET | Yes | List orders (admin only) |
| `/api/orders` | POST | Yes | Create new order |
| `/api/orders/{id}` | GET | Yes | Get order details |
| `/api/analytics` | GET | Yes | Get analytics data (admin only) |
| `/api/chat` | GET | Yes | Get chat messages |
| `/api/chat` | POST | Yes | Send chat message |
| `/api/files` | GET | Yes | Get files list |
| `/api/files` | POST | Yes | Upload file |
| `/api/payments` | GET | Yes | Get payments list |
| `/api/payments` | POST | Yes | Create payment |
| `/api/revisions` | GET | Yes | Get revisions list |
| `/api/revisions` | POST | Yes | Request revision |
| `/api/debug/users` | GET | No | Debug user info |

---

## Environment Variables

```env
# Database Configuration
MONGODB_URI=mongodb+srv://shreyansh:Eshbp%402005@cluster0.2ek6toj.mongodb.net/SkillX

# JWT Configuration
JWT_SECRET="SkillX"
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET="SkillX_Refresh"
JWT_REFRESH_EXPIRES_IN=30d

# Security Configuration (Optional)
BCRYPT_SALT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=7200000

# Node Environment
NODE_ENV=development
```

---

## Request/Response Patterns

### Standard Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}
```

### Standard Error Response
```json
{
  "success": false,
  "message": "Human readable error message",
  "error": "ERROR_CODE"
}
```

### Pagination Response
```json
{
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## Quick Reference

**Replace these placeholders in URLs/bodies:**
- `{accessToken}` → Token from login response (`data.tokens.accessToken`)
- `{refreshToken}` → Refresh token from login response (`data.tokens.refreshToken`)
- `{orderId}` → Order ID from create order response (`data.order._id`)

**Common Headers:**
- Authentication: `Authorization: Bearer {accessToken}`
- JSON Content: `Content-Type: application/json`

**Authentication Flow:**
1. Register Admin → Get tokens
2. Use accessToken for authenticated requests
3. Refresh token when accessToken expires

**Order Workflow:**
1. Create Order → Get orderId
2. Send messages via Chat
3. Upload files via Files API
4. Make payment via Payments
5. Request revisions if needed

**Admin Features:**
- View all orders, payments, revisions
- Access analytics dashboard
- Manage user accounts

**Client Features:**
- View own orders only
- Chat about specific orders
- Upload files for orders
- Make payments
- Request revisions

**Total Endpoints:** 18 (All Implemented!)

---

## Error Codes Reference

| Code | Description | Common Causes |
|------|-------------|---------------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Missing/invalid request data |
| 401 | Unauthorized | Missing/invalid auth token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server/database error |
| 501 | Not Implemented | Feature not available |

## Common Error Codes

- `NOT_AUTHENTICATED` - Missing or invalid auth token
- `INSUFFICIENT_PERMISSIONS` - User role lacks required permissions
- `USER_ALREADY_EXISTS` - Email already registered
- `INVALID_CREDENTIALS` - Wrong email/password
- `ORDER_NOT_FOUND` - Order ID doesn't exist
- `MISSING_ORDER_INFO` - Required order fields missing
- `UNAUTHORIZED_PAYMENT` - Can't pay for other user's order
- `UNAUTHORIZED_REVISION` - Can't request revision for other user's order
