# Nexus Backend API Documentation

## Base URL

```
http://localhost:3001/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### Register User

```http
POST /auth/register
```

**Request Body:**

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Validation Rules:**

- Username: 3-50 characters, alphanumeric and underscores only
- Email: Valid email format
- Password: Minimum 8 characters, must contain uppercase, lowercase, and number
- First Name: 1-100 characters
- Last Name: 1-100 characters

**Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "member",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- `400` - Validation failed
- `400` - Email already exists
- `400` - Username already exists
- `500` - Internal server error

#### Login User

```http
POST /auth/login
```

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "member"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- `400` - Validation failed
- `401` - Invalid email or password
- `401` - Account is deactivated
- `500` - Internal server error

#### Get User Profile

```http
GET /auth/profile
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "member",
    "is_active": true,
    "email_verified": false,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

- `401` - Unauthorized (missing or invalid token)
- `404` - User not found
- `500` - Internal server error

### Health Check

#### Get API Status

```http
GET /health
```

**Response (200):**

```json
{
  "success": true,
  "message": "Nexus Backend API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "field_name",
      "message": "Validation error message"
    }
  ]
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Security Features

- **Password Hashing**: All passwords are hashed using bcryptjs with 12 salt rounds
- **JWT Authentication**: Secure token-based authentication with 24-hour expiration
- **Input Validation**: Comprehensive validation for all user inputs
- **CORS Protection**: Configured to allow requests from frontend
- **Security Headers**: Helmet middleware for security headers

## Rate Limiting

Rate limiting will be implemented in future versions.

## Database Schema

*Database schema will be added later. The API is designed to handle database connection errors gracefully and provide helpful error messages when the database is not set up.*

### Expected Users Table Structure
```sql
-- This will be implemented later
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```
