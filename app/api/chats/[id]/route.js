import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    // Dynamic import to avoid build-time issues
    const { prisma } = await import('@/lib/prisma');
    const chat = await prisma.chat.findUnique({
      where: { id: params.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json({ error: "Failed to fetch chat" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    // Dynamic import to avoid build-time issues
    const { prisma } = await import('@/lib/prisma');
    await prisma.chat.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
  }
}

