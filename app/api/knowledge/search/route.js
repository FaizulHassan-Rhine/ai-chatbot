import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// Simple text-based search (for production, use vector embeddings)
export async function POST(req) {
  try {
    const { query } = await req.json();
    
    if (!query) {
      return NextResponse.json({ results: [] });
    }

    // SQLite doesn't support case-insensitive mode, so we'll filter in memory
    const allKnowledge = await prisma.knowledge.findMany();
    const queryLower = query.toLowerCase();
    const knowledge = allKnowledge
      .filter(
        (k) =>
          k.title.toLowerCase().includes(queryLower) ||
          k.content.toLowerCase().includes(queryLower)
      )
      .slice(0, 5);

    return NextResponse.json({ results: knowledge });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

