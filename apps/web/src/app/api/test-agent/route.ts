import { NextResponse } from "next/server";

export async function GET() {
  try {
    const agentUrl = process.env.PYTHON_AGENT_URL || "http://localhost:8080";

    console.log(`Calling Python agent at ${agentUrl}/health`);

    const response = await fetch(`${agentUrl}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Agent responded with status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "Successfully connected to Python agent",
      agentResponse: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error calling Python agent:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to connect to Python agent",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const agentUrl = process.env.PYTHON_AGENT_URL || "http://localhost:8080";

    console.log(`Sending message to Python agent:`, body);

    const response = await fetch(`${agentUrl}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Agent responded with status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "Successfully processed by Python agent",
      result: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error calling Python agent:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to process with Python agent",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
