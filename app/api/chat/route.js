import { NextResponse } from "next/server";

export async function POST(req) {
  const { messages } = await req.json();

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      process.env.GEMINI_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        }))
      })
    }
  );

  const data = await res.json();
  return NextResponse.json(data);
}
