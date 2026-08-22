import { NextResponse } from "next/server";

import { forwardPasswordCompletion } from "@/lib/ea-set-password/completion-route";

export async function POST(request: Request): Promise<NextResponse> {
  const result = await forwardPasswordCompletion(request);
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
