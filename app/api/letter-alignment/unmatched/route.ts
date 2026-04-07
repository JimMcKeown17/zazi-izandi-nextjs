import { NextResponse } from "next/server";

export async function GET() {
  const apiUrl = process.env.DJANGO_API_URL;
  if (!apiUrl) {
    return NextResponse.json(
      { error: "Backend API URL not configured" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${apiUrl}/api/letter-alignment/unmatched/`);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Backend returned an error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to reach backend" },
      { status: 502 }
    );
  }
}
