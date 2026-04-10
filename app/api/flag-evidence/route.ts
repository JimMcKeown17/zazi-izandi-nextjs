import { NextRequest, NextResponse } from "next/server";
import { djangoFetch } from "@/lib/django-fetch";

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

  try {
    const res = await djangoFetch(
      `/api/flag-evidence/?school=${encodeURIComponent(school)}&group=${encodeURIComponent(group)}`
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
