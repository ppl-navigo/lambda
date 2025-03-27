// middleware.ts
import { autometrics } from "@autometrics/autometrics";
import { NextResponse, NextRequest } from "next/server";

async function middlewareLogic(request: NextRequest) {
  console.log("Middleware triggered for path:", request.nextUrl.pathname);

  // Logika middleware Anda di sini
  return NextResponse.next();
}

// Bungkus middleware dengan autometrics
const middlewareWithMetrics = autometrics(middlewareLogic);

export default middlewareWithMetrics;

// Opsional: Batasi middleware pada rute tertentu
export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*"], // Middleware hanya berlaku untuk rute API dan dashboard
};
