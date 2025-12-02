import { NextResponse } from "next/server";

// Test endpoint to see raw Gemini streaming response
export async function GET() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set" },
        { status: 400 }
      );
    }

    const modelName = "gemini-2.0-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${process.env.GEMINI_API_KEY}`;

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: "Say hello in one word" }],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        {
          error: `API Error: ${res.status}`,
          details: errorText,
        },
        { status: res.status }
      );
    }

    // Read first few chunks to see the format
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const chunks = [];
    let totalBytes = 0;
    const maxBytes = 5000; // Read first 5KB

    while (totalBytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      chunks.push(chunk);
      totalBytes += value.length;
    }

    reader.cancel(); // Cancel the rest

    return NextResponse.json({
      success: true,
      status: res.status,
      contentType: res.headers.get("content-type"),
      chunks: chunks,
      combined: chunks.join(""),
      message: "First few chunks of streaming response shown above",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to test streaming",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

