import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const school = searchParams.get("school");
  const group = searchParams.get("group");

  if (!school || !group) {
    return NextResponse.json(
      { error: "school and group params required" },
      { status: 400 }
    );
  }

  const apiUrl = process.env.DJANGO_API_URL;
  if (!apiUrl) {
    return NextResponse.json(
      { error: "Backend API URL not configured" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(
      `${apiUrl}/api/flag-evidence/?school=${encodeURIComponent(school)}&group=${encodeURIComponent(group)}`
    );

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
