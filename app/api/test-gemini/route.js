import { NextResponse } from "next/server";

// Test endpoint to verify Gemini API key
export async function GET() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set in environment variables" },
        { status: 400 }
      );
    }

    // Try to list available models
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        {
          error: `API Error: ${res.status}`,
          details: errorText,
          message: "Your API key may be invalid or you may not have access to Gemini models",
        },
        { status: res.status }
      );
    }

    const data = await res.json();
    const availableModels = data.models
      ?.filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => ({
        name: m.name,
        displayName: m.displayName,
        supportedMethods: m.supportedGenerationMethods,
      })) || [];

    return NextResponse.json({
      success: true,
      apiKeySet: true,
      availableModels: availableModels,
      message: "API key is valid! Available models listed above.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to test API key",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

