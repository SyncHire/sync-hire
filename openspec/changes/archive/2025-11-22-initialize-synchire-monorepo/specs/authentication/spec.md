# Spec: Authentication

**Capability:** `authentication`
**Status:** Proposed
**Related Capabilities:** `database` (requires Prisma), `nextjs-application` (integrates with)

## Overview

Configure NextAuth.js v5 with Prisma adapter to provide Google OAuth and email/password authentication with role-based access control.

## ADDED Requirements

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

## Configuration

### Required Files

**src/auth.ts:**
```typescript
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = request.nextUrl.pathname.startsWith('/dashboard');

      if (isOnDashboard && !isLoggedIn) return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  }
});
```

**src/middleware.ts:**
```typescript
export { auth as middleware } from "@/auth";

export const config = {
  matcher: ['/dashboard/:path*', '/api/jobs/:path*', '/api/applications/:path*']
};
```

**src/app/api/auth/[...nextauth]/route.ts:**
```typescript
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
```

### Environment Variables

Required in `.env.local`:
```env
AUTH_SECRET=<generate with: openssl rand -base64 32>
AUTH_GOOGLE_ID=<from Google Cloud Console>
AUTH_GOOGLE_SECRET=<from Google Cloud Console>
NEXTAUTH_URL=http://localhost:3000
```

### Prisma Schema

NextAuth.js requires these models (added by Prisma adapter):
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?   // For credentials provider
  role          Role      @default(CANDIDATE)
  accounts      Account[]
  sessions      Session[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

enum Role {
  CANDIDATE
  EMPLOYER
  ADMIN
}
```

## Dependencies

- next-auth@beta (v5.0.0-beta.25+)
- @auth/prisma-adapter
- bcryptjs
- @types/bcryptjs (dev)
- Prisma (from database capability)

## Validation

- `pnpm add next-auth@beta @auth/prisma-adapter bcryptjs` succeeds
- Auth configuration file compiles without errors
- Middleware protects /dashboard/* routes
- Google OAuth flow works (redirects to Google, creates user)
- Email/password registration works (creates hashed password)
- Email/password login works (validates password)
- Role-based access control works (blocks unauthorized roles)
- Sessions persist across requests
- Logout clears session

## Security Considerations

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens in HTTP-only cookies (XSS protection)
- Secure flag in production (HTTPS only)
- SameSite=lax (CSRF protection)
- No password in JWT payload (only user ID, role)
- Email enumeration prevention (same error for invalid email/password)

## References

- [NextAuth.js v5 Documentation](https://authjs.dev)
- [Prisma Adapter](https://authjs.dev/reference/adapter/prisma)
- [Google OAuth Setup](https://next-auth.js.org/providers/google)
