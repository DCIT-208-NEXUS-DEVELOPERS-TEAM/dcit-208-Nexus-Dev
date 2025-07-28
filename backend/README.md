# Nexus Backend API

Backend API for the Nexus Developers DCIT 208 project.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Install dependencies**

   ```bash
   cd backend
   bun install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up database**

   ```bash
   # Database setup will be added later
   # For now, the API will handle database connection errors gracefully
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 📚 API Documentation

### Authentication Endpoints

#### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**

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

#### Login User

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**

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

#### Get User Profile

```http
GET /api/auth/profile
Authorization: Bearer <token>
```

**Response:**

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

### Health Check

```http
GET /health
```

## 🔧 Development

### Scripts

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun start` - Start production server
- `bun test` - Run tests

### Project Structure

```
src/
├── config/          # Database and app configuration
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Main application entry point
```

## 🛡️ Security Features

- **Password Hashing**: Using bcryptjs with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configured CORS for frontend
- **Helmet**: Security headers middleware
- **Rate Limiting**: (To be implemented)

## 🧪 Testing

```bash
bun test
```

## 📝 Environment Variables

| Variable       | Description           | Default                 |
| -------------- | --------------------- | ----------------------- |
| `PORT`         | Server port           | `5000`                  |
| `NODE_ENV`     | Environment           | `development`           |
| `DB_HOST`      | Database host         | `localhost`             |
| `DB_PORT`      | Database port         | `5432`                  |
| `DB_NAME`      | Database name         | `nexus_dev`             |
| `DB_USER`      | Database user         | `postgres`              |
| `DB_PASSWORD`  | Database password     | `password`              |
| `JWT_SECRET`   | JWT secret key        | `your-secret-key`       |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Add tests if applicable
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
