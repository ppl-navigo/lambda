# Navigo Frontend - Technical Documentation

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Architecture Overview](#3-architecture-overview)
4. [Modules](#4-modules)
5. [API Documentation](#5-api-documentation)
6. [Database & Storage](#6-database--storage)
7. [Environment Variables](#7-environment-variables)
8. [Deployment](#8-deployment)
9. [Monitoring & Logging](#9-monitoring--logging)

---

## 1. Introduction

Navigo is an AI-powered legal document platform designed specifically for Indonesian legal practitioners and businesses. The frontend application provides a modern, intuitive interface for creating, analyzing, and managing legal documents through advanced AI capabilities.

### Project Overview
- **Platform**: AI-powered legal document automation
- **Target Market**: Indonesia
- **Primary Functions**: Document generation, contract analysis, legal consultation
- **Technology Stack**: Next.js 15, TypeScript, React 18, TailwindCSS

### Key Features
- **AI Chat Assistant**: Interactive legal consultation with Indonesian law expertise
- **Document Generation**: Automated creation of legal documents
- **Contract Analysis**: AI-powered analysis of legal agreements (MOU analyzer)
- **Document Management**: Upload, download, and PDF export capabilities
- **Payment Integration**: Built-in payment system for premium features
- **User Balance Management**: Credit-based system for AI services

### Target Audience
- Legal practitioners in Indonesia
- Business professionals requiring legal documentation
- Companies needing contract analysis and legal consultation

## 2. Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Package Manager**: pnpm (recommended), npm, or yarn
- **Database**: PostgreSQL
- **External Services**: Supabase, Sentry, Google AI API

### Environment Setup
Create a `.env.local` file with the following variables:
```env
# Database
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# AI Services
GOOGLE_GENERATIVE_AI_API_KEY="your-google-ai-key"

# Sentry (optional)
SENTRY_DSN="your-sentry-dsn"

# Payment Integration
MIDTRANS_SERVER_KEY="your-midtrans-key"
```

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd navigo-frontend

# Install dependencies using pnpm (recommended)
pnpm install

# Or using npm
npm install

# Set up database
pnpm prisma generate
pnpm prisma db push
```

### Development Scripts
```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint

# Run tests with coverage
pnpm test

# Run tests in CI mode
pnpm test:ci
```

### Development Server
The application runs on `http://localhost:3000` by default. The development server supports:
- Hot module replacement
- TypeScript compilation
- Real-time error reporting
- Automatic code splitting

## 3. Architecture Overview

### Technology Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: TailwindCSS with custom animations
- **State Management**: React hooks and context
- **Database ORM**: Prisma
- **AI Integration**: Google AI SDK, OpenAI SDK
- **Storage**: Supabase
- **Testing**: Jest with React Testing Library
- **Monitoring**: Sentry
- **Deployment**: Vercel

### Project Structure
```
navigo-frontend/
├── app/                    # Next.js App Router directory
│   ├── api/               # API routes
│   ├── generated/         # Generated Prisma client
│   ├── utils/             # App-specific utilities
│   └── global-error.tsx   # Global error boundary
├── utils/                 # Shared utility functions
├── prisma/               # Database schema and migrations
├── types/                # TypeScript type definitions
├── tests/                # Test files
├── __mocks__/            # Jest mocks
├── .github/              # GitHub workflows
└── configuration files
```

### Architecture Patterns
- **API Routes**: Next.js API routes for backend functionality
- **Component-Based**: Modular React component architecture
- **Type Safety**: Full TypeScript implementation
- **Error Boundaries**: Comprehensive error handling
- **Responsive Design**: Mobile-first approach
- **Progressive Enhancement**: Works without JavaScript

### Data Flow
1. **User Input** → React Components
2. **API Calls** → Next.js API Routes
3. **Database Operations** → Prisma ORM
4. **AI Processing** → Google AI/OpenAI
5. **Response** → React State → UI Update

## 4. Modules

### 4.1 API Module (`/app/api`)

#### Chat API (`/chat`)
- **Purpose**: AI-powered legal consultation
- **Model**: Google Gemini 2.0 Flash
- **Features**: 
  - Indonesian law expertise
  - Citation support
  - Follow-up questions
  - Streaming responses

#### Legal Document API (`/legal-document`)
- **Purpose**: Document generation and management
- **Features**: Document creation, template processing
- **Integration**: AI-powered content generation

#### MOU Analyzer API (`/mou-analyzer`)
- **Purpose**: Contract and agreement analysis
- **Features**: AI-powered document analysis

#### Payment API (`/payment`)
- **Purpose**: Payment processing integration
- **Integration**: Midtrans payment gateway

#### Upload/Download APIs
- **Upload**: File upload handling with Supabase storage
- **Download**: Document retrieval and PDF generation
- **Export PDF**: Document to PDF conversion

#### Search API (`/search`)
- **Purpose**: Document and content search functionality

### 4.2 Utilities Module (`/utils`)

#### Database Utils (`prisma.ts`)
- Prisma client configuration
- Connection management
- Type-safe database operations

#### Supabase Utils (`supabase.ts`)
- File storage client
- Authentication integration
- Real-time subscriptions

#### Document Utils (`documentUtils.ts`)
- Document processing functions
- Format conversions
- Content manipulation

#### PDF Utils (`pdfUtils.ts`)
- PDF generation and manipulation
- Document export functionality

#### Balance Management
- `checkOrCreateBalance.ts`: User balance verification
- `checkBalanceThenDeduct.ts`: Payment processing

#### Legal Document Schema (`legalDocumentPageSchema.ts`)
- Zod validation schemas
- Type definitions for legal documents

### 4.3 Prompt Management (`/utils/prompts`)
- AI prompt templates
- Context management for AI interactions
- Specialized prompts for different legal document types

## 5. API Documentation

### Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

### Authentication
Currently using Supabase authentication for user management.

### Endpoints

#### POST `/api/chat`
**Purpose**: AI-powered legal consultation

**Request Body**:
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}
```

**Response**: Server-sent events stream with AI responses

**Features**:
- Indonesian law specialization
- Citation support
- 60-second max duration
- CORS enabled

#### POST `/api/legal-document`
**Purpose**: Generate legal documents

**Request Body**:
```typescript
{
  documentType: string
  parameters: Record<string, any>
  userId: string
}
```

**Response**:
```typescript
{
  documentId: string
  content: string
  downloadUrl?: string
}
```

#### POST `/api/mou-analyzer`
**Purpose**: Analyze legal contracts and MOUs

**Request Body**:
```typescript
{
  document: File | string
  analysisType: 'full' | 'summary' | 'risks'
}
```

#### POST `/api/upload`
**Purpose**: Upload documents to Supabase storage

**Request**: Multipart form data

**Response**:
```typescript
{
  fileUrl: string
  fileName: string
  fileSize: number
}
```

#### GET `/api/download/:documentId`
**Purpose**: Download generated documents

**Response**: File download stream

#### POST `/api/export-pdf`
**Purpose**: Convert documents to PDF format

**Request Body**:
```typescript
{
  content: string
  documentType: string
  options?: PdfOptions
}
```

#### POST `/api/payment`
**Purpose**: Process payments via Midtrans

**Request Body**:
```typescript
{
  amount: number
  userId: string
  orderId: string
}
```

#### GET `/api/search`
**Purpose**: Search documents and content

**Query Parameters**:
- `q`: Search query
- `type`: Document type filter
- `limit`: Result limit

### Error Handling
All APIs return standardized error responses:
```typescript
{
  error: string
  message: string
  statusCode: number
}
```

### Rate Limiting
- Chat API: 60 seconds max duration per request
- Upload API: File size limits enforced
- Payment API: Fraud protection enabled

## 6. Database & Storage

### Database Architecture

#### Database Provider
- **Primary**: PostgreSQL (via Prisma ORM)
- **Generated Client**: Custom Prisma client in `/app/generated/prisma`

#### Schema Overview

##### Orders Table (`orders`)
```prisma
model Order {
  order_id     String    @id
  user_id      String
  amount       Float
  payment_link String
  payments     Payment[]
}
```

##### Payments Table (`payments`)
```prisma
model Payment {
  payment_id         String   @id @default(uuid())
  currency           String
  status             String
  created_at         DateTime @default(now())
  transaction_time   DateTime
  transaction_status String
  order_id           String
  signature_key      String
  gross_amount       Float
  payment_type       String
  orderOrder_id      String
  metadata           Json     @default("{}")
  order              Order    @relation(fields: [orderOrder_id], references: [order_id])
}
```

##### Balance Table (`balances`)
```prisma
model Balance {
  balance_id String   @id @default(uuid())
  user_id    String   @unique
  amount     Float    @default(250000.0)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

### Storage Solutions

#### Supabase Storage
- **Purpose**: File storage for documents and uploads
- **Configuration**: `/utils/supabase.ts`
- **Features**:
  - Real-time file synchronization
  - Secure file access
  - CDN-backed delivery
  - Image optimization

#### Local Storage
- **Purpose**: Client-side data persistence
- **Implementation**: `localforage` for enhanced localStorage
- **Use Cases**:
  - User preferences
  - Draft documents
  - Session data

### Data Management

#### Prisma Integration
- **Client Generation**: Custom output to `/app/generated/prisma`
- **Type Safety**: Full TypeScript support
- **Migration Management**: Automated schema migrations
- **Connection Pooling**: Optimized for serverless environments

#### Balance Management System
- **Default Balance**: 250,000 credits per user
- **Deduction Logic**: Automatic balance deduction for AI services
- **Balance Verification**: Middleware for credit checking

#### Data Validation
- **Schema Validation**: Zod schemas for legal documents
- **Input Sanitization**: Comprehensive input validation
- **Type Checking**: Runtime type verification

### Backup and Security
- **Database Backups**: Automated PostgreSQL backups
- **Encryption**: Data encryption at rest and in transit
- **Access Control**: Row-level security policies
- **Audit Logging**: Transaction and access logging

## 7. Environment Variables

### Required Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL="https://your-api-domain.com/api"
VITE_AI_URL="https://your-ai-service-url.com"

# AI Services
GOOGLE_GENERATIVE_AI_API_KEY="your-google-ai-api-key"
OPENAI_API_KEY="sk-your-openai-api-key"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# Payment Integration
MIDTRANS_SERVER_KEY="your-midtrans-server-key"

# Monitoring (Optional)
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
```

### Variable Descriptions

#### `NEXT_PUBLIC_API_URL`
- **Purpose**: Base URL for API endpoints accessible from the client-side
- **Usage**: Used by frontend components to make API calls
- **Example**: `https://navigo-api.vercel.app/api`
- **Note**: Must be prefixed with `NEXT_PUBLIC_` to be accessible in browser
- **Required**: Yes for production builds

#### `GOOGLE_GENERATIVE_AI_API_KEY`
- **Purpose**: Authentication key for Google's Generative AI services (Gemini)
- **Usage**: Powers the AI chat functionality and document analysis
- **How to obtain**: 
  1. Visit [Google AI Studio](https://aistudio.google.com/)
  2. Create a new API key
  3. Copy the generated key
- **Example**: `AIzaSyD1234567890abcdefghijklmnopqrstuvwxyz`
- **Security**: Server-side only, never expose to client
- **Required**: Yes for AI features

#### `OPENAI_API_KEY`
- **Purpose**: Authentication key for OpenAI's API services
- **Usage**: Alternative AI provider for document generation and analysis
- **How to obtain**:
  1. Visit [OpenAI Platform](https://platform.openai.com/)
  2. Navigate to API Keys section
  3. Create a new secret key
- **Example**: `sk-1234567890abcdefghijklmnopqrstuvwxyzABCDEF`
- **Security**: Server-side only, handle with extreme care
- **Required**: Optional (if using OpenAI as AI provider)

#### `VITE_AI_URL`
- **Purpose**: URL endpoint for AI services (legacy Vite configuration)
- **Usage**: Fallback or alternative AI service endpoint
- **Example**: `https://ai-service.example.com/v1`
- **Note**: May be used for custom AI implementations
- **Required**: Optional

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Purpose**: Supabase project URL for database and storage access
- **Usage**: Database operations, file storage, and real-time subscriptions
- **How to obtain**:
  1. Create project at [Supabase](https://supabase.com/)
  2. Go to Project Settings → API
  3. Copy the Project URL
- **Example**: `https://abcdefghijklmnop.supabase.co`
- **Security**: Safe to expose to client (public URL)
- **Required**: Yes for database and storage functionality

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Purpose**: Supabase anonymous/public API key
- **Usage**: Client-side authentication and API access
- **How to obtain**:
  1. In Supabase dashboard, go to Project Settings → API
  2. Copy the "anon public" key
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Security**: Safe to expose to client (designed for public use)
- **Required**: Yes for Supabase integration

### Environment-Specific Configuration

#### Development (`.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
VITE_AI_URL="http://localhost:8080/ai"
GOOGLE_GENERATIVE_AI_API_KEY="your-dev-google-key"
NEXT_PUBLIC_SUPABASE_URL="https://your-dev-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-dev-supabase-key"
```

#### Production (Vercel Environment Variables)
Set these in your Vercel dashboard under Project Settings → Environment Variables:
- All variables from development
- Ensure production API URLs
- Use production Supabase project
- Enable all monitoring tools

#### Security Best Practices
- **Never commit** `.env` files to version control
- Use different keys for development and production
- Regularly rotate API keys
- Monitor API usage and set usage limits
- Use environment-specific Supabase projects

## 8. Deployment

### Deployment Platforms
- **Primary**: Vercel (Next.js optimized)
- **Alternative**: Any Node.js compatible platform

### CI/CD Pipelines

#### Production Deployment (`.github/workflows/deploy.yml`)
```yaml
# Triggers on push to main/master branches
on:
  push:
    branches: [main, master]

# Jobs:
1. Code Analysis (SonarQube)
2. Build Application
3. Deploy to Vercel Production
```

**Environment Variables Required**:
- `SONAR_TOKEN`: SonarQube analysis token
- `SONAR_HOST_URL`: SonarQube server URL
- `VERCEL_TOKEN`: Vercel deployment token
- `GH_TOKEN`: GitHub access token
- `ORG_ID`: Vercel organization ID
- `PROJECT_ID`: Vercel project ID

#### Staging Deployment (`.github/workflows/deploy-staging.yml`)
```yaml
# Triggers on push to staging branch
on:
  push:
    branches: [staging]

# Similar to production but deploys to staging environment
```

**Additional Environment Variables**:
- `ORG_ID_STAGING`: Staging organization ID
- `PROJECT_ID_STAGING`: Staging project ID

#### Preview Deployment (`.github/workflows/staging.yml`)
```yaml
# Triggers on all pull requests
on:
  pull_request:
    branches: ["*"]

# Features:
- Automatic preview deployment
- Code quality analysis
- Preview URL generation
```

### Deployment Configuration

#### Next.js Configuration (`next.config.js`)
```javascript
// Key features:
- Sentry integration for error monitoring
- CORS headers for API routes
- Webpack configuration for Node.js modules
- ESLint disabled during builds for performance
```

#### Build Optimization
- **Automatic Code Splitting**: Next.js automatic optimization
- **Image Optimization**: Built-in Next.js image optimization
- **Bundle Analyzer**: Webpack bundle analysis
- **Sentry Source Maps**: Automatic source map upload

#### Environment-Specific Settings
- **Production**: Full Sentry monitoring, optimized builds
- **Staging**: Limited monitoring, debug mode enabled
- **Development**: Hot reloading, detailed error messages

### Security Considerations

#### Deployment Security
- **Environment Variables**: Secure secret management
- **HTTPS Enforcement**: SSL/TLS encryption
- **CORS Configuration**: Proper cross-origin resource sharing
- **Rate Limiting**: API abuse prevention

#### Data Protection
- **Database Security**: Connection encryption
- **File Upload Security**: Malware scanning and type validation
- **Authentication**: Secure user authentication via Supabase

### Scaling Considerations

#### Performance Optimization
- **Static Generation**: ISR (Incremental Static Regeneration)
- **Edge Functions**: Vercel Edge Runtime for global performance
- **CDN Integration**: Global content delivery
- **Database Optimization**: Connection pooling and query optimization

#### Load Handling
- **Serverless Architecture**: Auto-scaling serverless functions
- **Database Scaling**: PostgreSQL read replicas
- **File Storage**: Supabase CDN for file delivery
- **Cache Strategy**: Redis caching for frequently accessed data

## 9. Monitoring & Logging

### Error Tracking & Performance Monitoring

#### Sentry Integration
- **Error Tracking**: Automatic error capture and reporting
- **Performance Monitoring**: Real-time performance metrics
- **Release Tracking**: Deployment and release monitoring
- **User Feedback**: User feedback collection
- **Configuration**: Integrated via `@sentry/nextjs`

**Key Features**:
- Automatic source map upload
- Server-side and client-side error tracking
- Performance transaction monitoring
- Release health monitoring
- Custom error boundaries

#### Vercel Analytics
- **Web Vitals**: Core web vitals monitoring
- **Speed Insights**: Performance analysis
- **Edge Logs**: Serverless function logging
- **Real User Monitoring**: Actual user experience metrics

### Application Logging

#### Development Logging
```typescript
// Console logging for development
console.log('Debug information')
console.error('Error details')
console.warn('Warning messages')
```

#### Production Logging
```typescript
// Structured logging with Sentry
import * as Sentry from '@sentry/nextjs'

// Log errors
Sentry.captureException(error)

// Log custom events
Sentry.addBreadcrumb({
  message: 'User action',
  level: 'info'
})
```

#### API Logging
- **Request/Response Logging**: Automatic API call tracking
- **Error Logging**: Comprehensive error details
- **Performance Metrics**: Response time monitoring
- **User Actions**: AI chat interactions and document generation

### Monitoring Dashboards

#### Sentry Dashboard
- Real-time error tracking
- Performance bottleneck identification
- User impact analysis
- Release comparison metrics

#### Vercel Dashboard
- Build and deployment status
- Function execution metrics
- Bandwidth and request analytics
- Geographic performance data

### Alerting & Notifications

#### Error Alerts
- **Critical Errors**: Immediate Slack/email notifications
- **Performance Degradation**: Automatic alerts for slow responses
- **High Error Rates**: Threshold-based alerting
- **Deployment Issues**: Build and deployment failure notifications

#### Custom Monitoring
```typescript
// Custom metrics tracking
Sentry.setTag('feature', 'document-generation')
Sentry.setUser({ id: userId, email: userEmail })
Sentry.setContext('document', { type, size, processingTime })
```

### Log Analysis & Debugging

#### Structured Logging Format
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "error",
  "message": "Document generation failed",
  "userId": "user123",
  "documentType": "contract",
  "error": {
    "name": "ValidationError",
    "message": "Missing required fields",
    "stack": "..."
  },
  "context": {
    "feature": "legal-document-api",
    "version": "1.2.3"
  }
}
```

#### Log Retention
- **Development**: 7 days
- **Staging**: 30 days
- **Production**: 90 days
- **Critical Errors**: 1 year

### Performance Benchmarks
- **Page Load**: <2 seconds first contentful paint
- **API Response**: <500ms average response time
- **Uptime**: 99.9% availability target
- **Error Rate**: <0.1% error rate threshold

---

### Quick Reference

#### Development Workflow
1. Create feature branch
2. Develop and test locally
3. Push to create pull request
4. Automatic preview deployment
5. Code review and merge
6. Automatic production deployment

#### Emergency Procedures
- **Rollback**: Vercel instant rollback capability
- **Database Recovery**: Automated backup restoration
- **Monitoring**: Real-time error alerts via Sentry
- **Support**: Comprehensive logging for issue diagnosis
