import { NextRequest, NextResponse } from "next/server";
import { requestProtocol } from "@/lib/http";
import {
  demoCookie,
  getDemoId,
  lifetime,
  newDemo,
  readDemo,
} from "@/lib/demo-store";

export async function GET(request: NextRequest) {
  const destination = request.nextUrl.searchParams.get("para");
  const path =
    destination === "painel"
      ? "/painel"
      : destination === "cozinha"
        ? "/cozinha"
        : "/cardapio";
  const response = new NextResponse(null, {
    status: 307,
    headers: { Location: path, "Cache-Control": "private, no-store" },
  });
  const existing = await getDemoId();
  if (!existing || !(await readDemo(existing))) {
    response.cookies.set(demoCookie, await newDemo(), {
      httpOnly: true,
      sameSite: "lax",
      secure: requestProtocol(request) === "https:",
      path: "/",
      maxAge: lifetime,
    });
  }
  return response;
}
