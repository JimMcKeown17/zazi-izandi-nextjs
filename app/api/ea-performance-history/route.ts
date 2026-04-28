import { NextRequest, NextResponse } from "next/server";
import { djangoFetch } from "@/lib/django-fetch";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const cohort = searchParams.get("cohort") ?? "all";

  try {
    const params = new URLSearchParams({ cohort });
    const res = await djangoFetch(
      `/api/ea-performance-history/?${params.toString()}`
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
