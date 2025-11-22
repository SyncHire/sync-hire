/**
 * API Route: Generate Stream Video token for a user
 * POST /api/stream-token
 */
import { NextResponse } from "next/server";
import { generateStreamToken } from "@/lib/stream-token";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const token = generateStreamToken(userId);

    return NextResponse.json({ token, userId });
  } catch (error) {
    console.error("Error generating Stream token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 },
    );
  }
}
