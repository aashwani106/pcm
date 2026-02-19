import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    const upstream = await fetch(`${API_BASE_URL}/enrollments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Enrollment API is unreachable. Ensure backend is running on port 4000.",
        errors: error instanceof Error ? error.message : error,
      },
      { status: 503 }
    );
  }
}
