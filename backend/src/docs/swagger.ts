import swaggerJsdoc from "swagger-jsdoc";
import env from "../config/env";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ABCECG Membership Management API",
      version: "1.0.0",
      description: `
# ABCECG Membership Management System

The Association of Building and Civil Engineering Contractors of Ghana (ABCECG) Membership Management API provides comprehensive functionality for:

- **Member Company Management**: Complete CRUD operations for construction companies
- **Membership Applications**: Multi-level approval workflow (Regional → National)
- **Content Management**: News, projects, and meetings with role-based access
- **Advanced Search**: Global search across all content types with filtering
- **File Management**: Secure S3-based document and certificate uploads
- **Authentication & Authorization**: JWT-based auth with role-based access control

## Authentication

This API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Roles & Permissions

- **ADMIN**: Full system access
- **NATIONAL_SECRETARIAT**: Global access, final approvals
- **REGIONAL_SECRETARIAT**: Regional scope, initial approvals  
- **COMPANY_REP**: Own company data, create applications
- **MEMBER**: Basic member access

## Test Credentials

For testing purposes, use these seeded accounts:
- Admin: \`admin@abcecg.org\` / \`Admin@123\`
- National Secretary: \`national@abcecg.org\` / \`National@123\`
- Regional Secretary: \`regional.ga@abcecg.org\` / \`Regional@123\`
- Company Rep: \`rep@mapp-h.com\` / \`Rep@123\`
      `,
      contact: {
        name: "ABCECG Development Team",
        email: "dev@abcecg.org",
        url: "https://abcecg.org",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: "Development server",
      },
      {
        url: "https://api.abcecg.org",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token for authentication",
        },
      },
      schemas: {
        // Common schemas
        ApiResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              description: "Indicates if the request was successful",
            },
            message: {
              type: "string",
              description: "Human-readable message",
            },
            data: {
              description: "Response data (varies by endpoint)",
            },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  message: { type: "string" },
                },
              },
              description: "Validation errors (when applicable)",
            },
            meta: {
              type: "object",
              properties: {
                page: { type: "integer" },
                limit: { type: "integer" },
                total: { type: "integer" },
                totalPages: { type: "integer" },
              },
              description: "Pagination metadata (for list endpoints)",
            },
          },
        },
        
        // User & Auth schemas
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            username: { type: "string" },
            firstName: { type: "string", nullable: true },
            lastName: { type: "string", nullable: true },
            phone: { type: "string", nullable: true },
            isActive: { type: "boolean" },
            role: {
              type: "string",
              enum: ["ADMIN", "NATIONAL_SECRETARIAT", "REGIONAL_SECRETARIAT", "COMPANY_REP", "MEMBER"],
            },
            regionId: { type: "string", format: "uuid", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
          },
        },
        
        RegisterRequest: {
          type: "object",
          required: ["username", "email", "password", "firstName", "lastName"],
          properties: {
            username: { type: "string", minLength: 3, maxLength: 50 },
            email: { type: "string", format: "email" },
            password: { 
              type: "string", 
              minLength: 8,
              description: "Must contain at least one uppercase, lowercase, and number"
            },
            firstName: { type: "string", minLength: 1, maxLength: 100 },
            lastName: { type: "string", minLength: 1, maxLength: 100 },
            phone: { type: "string" },
            regionId: { type: "string", format: "uuid" },
          },
        },
        
        AuthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            user: { $ref: "#/components/schemas/User" },
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
          },
        },
        
        // Region schema
        Region: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Greater Accra" },
          },
        },
        
        // Company schemas
        Company: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            email: { type: "string", format: "email", nullable: true },
            phone: { type: "string", nullable: true },
            website: { type: "string", format: "uri", nullable: true },
            address: { type: "string", nullable: true },
            gpsAddress: { type: "string", nullable: true },
            region: { type: "string", nullable: true },
            gradeDK: { 
              type: "string", 
              nullable: true,
              description: "Classification grade (D1K1, D2K2, etc.)"
            },
            roadClass: { 
              type: "string", 
              nullable: true,
              description: "Road classification (A3, B3, etc.)"
            },
            natureOfBusiness: {
              type: "array",
              items: { type: "string" },
              description: "Types of construction work"
            },
            description: { type: "string", nullable: true },
            ownerUserId: { type: "string", format: "uuid", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        
        CompanyCreateRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 2 },
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            website: { type: "string", format: "uri" },
            address: { type: "string" },
            gpsAddress: { type: "string" },
            region: { type: "string" },
            gradeDK: { type: "string" },
            roadClass: { type: "string" },
            natureOfBusiness: {
              type: "array",
              items: { type: "string" }
            },
            description: { type: "string" },
          },
        },
        
        // Application schemas
        MembershipApplication: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            companyId: { type: "string", format: "uuid" },
            submittedById: { type: "string", format: "uuid" },
            regionId: { type: "string", format: "uuid" },
            state: {
              type: "string",
              enum: ["DRAFT", "SUBMITTED", "REGION_REVIEW", "REQUESTED_CHANGES", "NATIONAL_REVIEW", "APPROVED", "REJECTED"]
            },
            reasonRejected: { type: "string", nullable: true },
            form: {
              type: "object",
              description: "Application form data"
            },
            submittedAt: { type: "string", format: "date-time", nullable: true },
            decidedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            company: { $ref: "#/components/schemas/Company" },
            region: { $ref: "#/components/schemas/Region" },
            submittedBy: { $ref: "#/components/schemas/User" },
          },
        },
        
        // Content schemas
        News: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            content: { type: "string" },
            publishedAt: { type: "string", format: "date-time" },
            authorId: { type: "string", format: "uuid", nullable: true },
            author: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                firstName: { type: "string" },
                lastName: { type: "string" },
                role: { type: "string" },
              }
            }
          },
        },
        
        NewsCreateRequest: {
          type: "object",
          required: ["title", "content"],
          properties: {
            title: { type: "string", minLength: 1, maxLength: 200 },
            content: { type: "string", minLength: 1 },
          },
        },
        
        Project: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            description: { type: "string", nullable: true },
            publishedAt: { type: "string", format: "date-time" },
            authorId: { type: "string", format: "uuid", nullable: true },
            author: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                firstName: { type: "string" },
                lastName: { type: "string" },
                role: { type: "string" },
              }
            }
          },
        },
        
        ProjectCreateRequest: {
          type: "object",
          required: ["title"],
          properties: {
            title: { type: "string", minLength: 1, maxLength: 200 },
            description: { type: "string" },
          },
        },
        
        Meeting: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            scheduledAt: { type: "string", format: "date-time" },
            link: { type: "string", format: "uri", nullable: true },
            createdById: { type: "string", format: "uuid", nullable: true },
            createdBy: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                firstName: { type: "string" },
                lastName: { type: "string" },
                role: { type: "string" },
              }
            }
          },
        },
        
        MeetingCreateRequest: {
          type: "object",
          required: ["title", "scheduledAt"],
          properties: {
            title: { type: "string", minLength: 1, maxLength: 200 },
            scheduledAt: { type: "string", format: "date-time" },
            link: { type: "string", format: "uri" },
          },
        },
        
        // Search schemas
        SearchResponse: {
          type: "object",
          properties: {
            query: { type: "string" },
            type: { type: "string" },
            totalResults: { type: "integer" },
            results: {
              type: "object",
              properties: {
                companies: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Company" }
                },
                news: {
                  type: "array",
                  items: { $ref: "#/components/schemas/News" }
                },
                projects: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Project" }
                },
                meetings: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Meeting" }
                },
              }
            }
          },
        },
        
        // Health schema
        HealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["healthy", "unhealthy"] },
            timestamp: { type: "string", format: "date-time" },
            environment: { type: "string" },
            version: { type: "string" },
            uptime: { type: "number" },
            memory: {
              type: "object",
              properties: {
                rss: { type: "integer" },
                heapTotal: { type: "integer" },
                heapUsed: { type: "integer" },
                external: { type: "integer" },
              }
            },
            checks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  service: { type: "string" },
                  status: { type: "string", enum: ["healthy", "unhealthy"] },
                  latency: { type: "integer" },
                  error: { type: "string" },
                }
              }
            }
          },
        },
        
        // Error schemas
        ValidationError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Validation failed" },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  message: { type: "string" },
                }
              }
            }
          },
        },
        
        UnauthorizedError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Authentication required" },
          },
        },
        
        ForbiddenError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Insufficient permissions" },
          },
        },
        
        NotFoundError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Resource not found" },
          },
        },
      },
      
      responses: {
        ValidationError: {
          description: "Validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ValidationError" }
            }
          }
        },
        UnauthorizedError: {
          description: "Authentication required",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UnauthorizedError" }
            }
          }
        },
        ForbiddenError: {
          description: "Insufficient permissions",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ForbiddenError" }
            }
          }
        },
        NotFoundError: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/NotFoundError" }
            }
          }
        },
      },
      
      parameters: {
        PageParam: {
          name: "page",
          in: "query",
          description: "Page number for pagination",
          schema: {
            type: "integer",
            minimum: 1,
            default: 1,
          },
        },
        LimitParam: {
          name: "limit",
          in: "query",
          description: "Number of items per page",
          schema: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
        SearchParam: {
          name: "q",
          in: "query",
          description: "Search query",
          schema: {
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
        },
      },
    },
    
    tags: [
      {
        name: "Health",
        description: "System health and monitoring endpoints",
      },
      {
        name: "Authentication",
        description: "User authentication and authorization",
      },
      {
        name: "Regions",
        description: "Ghana regions management",
      },
      {
        name: "Companies",
        description: "Member company directory and management",
      },
      {
        name: "Applications",
        description: "Membership application workflow",
      },
      {
        name: "Files",
        description: "Document and certificate file uploads",
      },
      {
        name: "News",
        description: "News and announcements management",
      },
      {
        name: "Projects",
        description: "Project showcase management",
      },
      {
        name: "Meetings",
        description: "Meeting scheduling and management",
      },
      {
        name: "Search",
        description: "Advanced search across all content types",
      },
    ],
  },
  apis: [
    "./src/**/*.ts", // Include all TypeScript files for JSDoc comments
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
