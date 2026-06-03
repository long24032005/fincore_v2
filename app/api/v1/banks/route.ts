import { NextRequest, NextResponse } from "next/server";
import { getLoggedInUser, exchangePublicToken } from "@/lib/actions/user.actions";
import { getAccounts } from "@/lib/actions/bank.actions";

export async function GET(req: NextRequest) {
  try {
    const user = await getLoggedInUser();
    if (!user || !user.$id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const accountsData = await getAccounts({ userId: user.$id });
    return NextResponse.json(accountsData?.data || [], { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "An error occurred fetching bank accounts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getLoggedInUser();
    if (!user || !user.$id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { bankName, accountId } = await req.json();
    if (!bankName || !accountId) {
      return NextResponse.json({ error: "bankName and accountId are required" }, { status: 400 });
    }

    const linkResult = await exchangePublicToken({
      publicToken: bankName,
      user,
      accountId: accountId.trim(),
      bankName: bankName.trim(),
    });

    if (!linkResult || linkResult.error) {
      return NextResponse.json({ error: linkResult?.message || "Failed to link bank account" }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: `Successfully linked ${bankName} account number ${accountId}` },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "An error occurred linking bank account" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
