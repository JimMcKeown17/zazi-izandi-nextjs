import { NextRequest, NextResponse } from "next/server";
import { djangoFetch } from "@/lib/django-fetch";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const school = searchParams.get("school");
  const group = searchParams.get("group");

  try {
    const params = new URLSearchParams();
    if (school) params.set("school", school);
    if (group) params.set("group", group);

    const res = await djangoFetch(
      `/api/letter-alignment/?${params.toString()}`
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
