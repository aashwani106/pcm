import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const accessToken = req.nextUrl.searchParams.get("access_token");

  if (!id || !accessToken) {
    return NextResponse.json({ message: "Session id and access token are required" }, { status: 400 });
  }

  const upstream = await fetch(
    `${API_BASE_URL}/live-sessions/${id}/requests/stream?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "GET",
      headers: {
        Accept: "text/event-stream"
      }
    }
  );

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
