# SkillX API Documentation

Base URL: http://localhost:3000

Auth
- Register Admin: POST /api/auth/register-admin
  - body: { email, password, firstName, lastName, phone }
  - 201: { success, message, data: { user, tokens } }
  - 400: USER_ALREADY_EXISTS

- Login: POST /api/auth/login
  - body: { email, password }
  - 200: { success, message, data: { user, tokens } }
  - 401: INVALID_CREDENTIALS
  - 403: INSUFFICIENT_PRIVILEGES (if non-admin)

Health
- GET /api/health
  - 200: { success, message, timestamp, environment, version }

Orders
- GET /api/orders
  - headers: Authorization: Bearer <accessToken>
  - query: page, limit, sortBy, sortOrder
  - 200: { success, data: { orders, pagination } }
  - 403: INSUFFICIENT_PERMISSIONS

- GET /api/orders/:orderId
  - headers: Authorization: Bearer <accessToken>
  - 200: { success, data: { order } }
  - 401: NOT_AUTHENTICATED
  - 403: RESOURCE_ACCESS_DENIED
  - 404: ORDER_NOT_FOUND

Stubs (Not Implemented - return 501)
- /api/payments
- /api/revisions
- /api/files
- /api/chat
- /api/analytics

Environment Variables
- MONGODB_URI
- JWT_SECRET
- JWT_EXPIRES_IN (default 7d)
- JWT_REFRESH_SECRET (fallback to JWT_SECRET)
- JWT_REFRESH_EXPIRES_IN (default 30d)
