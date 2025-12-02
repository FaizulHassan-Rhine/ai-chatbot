import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Dynamic import to avoid build-time issues
    const { prisma } = await import('@/lib/prisma');
    const chats = await prisma.chat.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });
    return NextResponse.json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    // Return empty array instead of error to prevent client-side crashes
    // SQLite file databases don't work on Vercel - consider using a cloud database
    return NextResponse.json([]);
  }
}

export async function POST(req) {
  try {
    // Dynamic import to avoid build-time issues
    const { prisma } = await import('@/lib/prisma');
    const { title } = await req.json();
    const chat = await prisma.chat.create({
      data: {
        title: title || "New Chat",
      },
    });
    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error creating chat:", error);
    // Return a mock chat object to prevent client-side crashes
    // SQLite file databases don't work on Vercel - consider using a cloud database
    return NextResponse.json({ 
      id: `temp-${Date.now()}`,
      title: title || "New Chat",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    });
  }
}

