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

  const upstream = await fetch(`${API_BASE_URL}/live-sessions/${id}/requests/${requestId}`, {
    method: "GET"
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" }
  });
}
