import { NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ message: "Session id is required" }, { status: 400 });
  }

  const body = await req.text();
  const upstream = await fetch(`${API_BASE_URL}/live-sessions/${id}/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" }
  });
}
