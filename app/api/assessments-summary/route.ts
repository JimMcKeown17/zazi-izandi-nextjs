import { NextResponse } from "next/server";
import { djangoFetch } from "@/lib/django-fetch";

export async function GET() {
  try {
    const res = await djangoFetch("/api/assessments-summary/");

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
