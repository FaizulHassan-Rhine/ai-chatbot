import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Dynamic import to avoid build-time issues
    const { prisma } = await import('@/lib/prisma');
    const knowledge = await prisma.knowledge.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(knowledge);
  } catch (error) {
    console.error("Error fetching knowledge:", error);
    return NextResponse.json({ error: "Failed to fetch knowledge" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    // Dynamic import to avoid build-time issues
    const { prisma } = await import('@/lib/prisma');
    const { title, content } = await req.json();
    const knowledge = await prisma.knowledge.create({
      data: {
        title,
        content,
      },
    });
    return NextResponse.json(knowledge);
  } catch (error) {
    console.error("Error creating knowledge:", error);
    return NextResponse.json({ error: "Failed to create knowledge" }, { status: 500 });
  }
}

