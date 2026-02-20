import { NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; requestId: string }> }
) {
  const { id, requestId } = await context.params;

  if (!id || !requestId) {
    return NextResponse.json({ message: "Session id and request id are required" }, { status: 400 });
  }

  const upstream = await fetch(`${API_BASE_URL}/live-sessions/${id}/requests/${requestId}/stream`, {
    method: "GET",
    headers: {
      Accept: "text/event-stream"
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
