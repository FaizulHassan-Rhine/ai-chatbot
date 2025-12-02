import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { text, targetLang = "en" } = await req.json();

    // Using Google Translate API (you can also use other services)
    // For now, a simple placeholder - replace with actual translation API
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );

    const data = await res.json();
    const translated = data[0]?.map((item) => item[0]).join("") || text;

    return NextResponse.json({ translated });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}

