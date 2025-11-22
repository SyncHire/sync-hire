# authentication Specification

## Purpose
TBD - created by archiving change initialize-synchire-monorepo. Update Purpose after archive.
## Requirements
### Requirement: NextAuth.js v5 Configuration

The system SHALL provide NextAuth.js v5 authentication with JWT sessions and Prisma database adapter.

#### Scenario: Initialize authentication

**Given** the Next.js application is set up
**When** a developer creates auth.ts configuration
**Then** NextAuth.js is configured with Prisma adapter
**And** JWT session strategy is enabled
**And** Google OAuth provider is registered
**And** Credentials provider is registered for email/password

#### Scenario: Access authentication in Server Components

**Given** a protected page needs user information
**When** the page calls `await auth()`
**Then** it receives the current session or null
**And** session includes user ID, email, name, and role
**And** the call works in Server Components

#### Scenario: Protect API routes

**Given** an API route requires authentication
**When** an unauthenticated user makes a request
**Then** the system returns 401 Unauthorized
**And** provides error message "Authentication required"

### Requirement: Google OAuth Provider

The system SHALL support Google OAuth authentication for one-click sign-in.

#### Scenario: Sign in with Google

**Given** a user clicks "Sign in with Google"
**When** they authorize the application
**And** complete Google authentication
**Then** NextAuth.js creates or updates their user record in PostgreSQL
**And** creates an Account record linking Google account
**And** creates a session (JWT token in HTTP-only cookie)
**And** redirects to /dashboard

#### Scenario: First-time Google sign-in

**Given** a user signs in with Google for the first time
**When** authentication completes
**Then** a new User record is created with Google email
**And** role defaults to CANDIDATE
**And** emailVerified is set to true (Google verifies emails)
**And** Account record stores Google OAuth tokens

### Requirement: Email/Password Authentication

The system SHALL support traditional email/password authentication with bcrypt hashing.

#### Scenario: Register with email/password

**Given** a user provides email and password
**When** they submit the registration form
**Then** password is hashed with bcrypt (10 rounds)
**And** User record is created with hashed password
**And** emailVerified is set to false
**And** user is signed in automatically

#### Scenario: Sign in with email/password

**Given** a registered user provides correct credentials
**When** they submit the login form
**Then** system verifies password against bcrypt hash
**And** creates session (JWT token)
**And** redirects to /dashboard

#### Scenario: Invalid credentials

**Given** a user provides incorrect password
**When** they submit the login form
**Then** system returns error "Invalid credentials"
**And** does not reveal whether email exists (security)
**And** does not create session

### Requirement: Role-Based Access Control

The system SHALL support role-based access control with EMPLOYER and CANDIDATE roles.

#### Scenario: Employer-only route protection

**Given** a route is employer-only (e.g., /jobs/new)
**When** a user with role CANDIDATE accesses it
**Then** system returns 403 Forbidden
**And** provides error message "Employer access required"

#### Scenario: Role assignment

**Given** a user registers
**When** they select role during registration
**Then** User record is created with selected role
**And** role is included in JWT claims
**And** role is accessible in all auth checks

### Requirement: Session Management

The system SHALL manage sessions using JWT tokens stored in HTTP-only cookies.

#### Scenario: Session cookie security

**Given** a user signs in
**When** session is created
**Then** cookie is HTTP-only (prevents XSS)
**And** cookie is Secure in production (HTTPS only)
**And** cookie has SameSite=lax (CSRF protection)
**And** cookie expires in 7 days

#### Scenario: Session validation

**Given** a user has an active session
**When** they make authenticated requests
**Then** JWT token is validated on each request
**And** user information is extracted from token
**And** expired tokens are rejected

### Requirement: Middleware Route Protection

The system SHALL use Next.js middleware to protect routes requiring authentication.

#### Scenario: Redirect unauthenticated users

**Given** middleware is configured for /dashboard/*
**When** an unauthenticated user accesses /dashboard/jobs
**Then** they are redirected to /login
**And** return URL is preserved (/login?callbackUrl=/dashboard/jobs)

#### Scenario: Allow authenticated access

**Given** an authenticated user accesses /dashboard
**When** middleware runs
**Then** request proceeds normally
**And** user can access the protected route

