/**
 * Better Auth API Route Handler
 *
 * Handles all authentication endpoints:
 * - /api/auth/sign-up
 * - /api/auth/sign-in
 * - /api/auth/sign-out
 * - /api/auth/session
 * - /api/auth/verify-email
 * - /api/auth/reset-password
 * - /api/auth/callback/google
 * - /api/auth/organization/*
 */

import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
