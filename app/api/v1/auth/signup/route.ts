import { NextRequest, NextResponse } from "next/server";
import { signUp } from "@/lib/actions/user.actions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await signUp(body);
    
    if (!result || result.error) {
      return NextResponse.json(
        { error: result?.message || "Registration failed" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "An error occurred during registration" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
