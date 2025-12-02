import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

