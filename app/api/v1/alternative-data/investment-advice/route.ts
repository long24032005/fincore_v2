import { NextResponse } from "next/server";

// This endpoint has been deprecated and consolidated into /api/v1/alternative-data/risk-appetite
// which includes full portfolio allocation via the Double-Matching Algorithm (Cosine Similarity × Risk Score)
// across 150 investment products, powered by Gemini AI narrative generation.
//
// Clients should use GET /api/v1/alternative-data/risk-appetite?runAnalysis=true instead.

export async function GET() {
  return NextResponse.json(
    {
      error: {
        code: "ENDPOINT_DEPRECATED",
        message: "This endpoint has been deprecated. Please use GET /api/v1/alternative-data/risk-appetite which includes full portfolio recommendations via the Fincore Double-Matching Algorithm.",
        documentation: "/api/v1/openapi.json",
        http_status: 410,
      },
    },
    { status: 410 }
  );
}
