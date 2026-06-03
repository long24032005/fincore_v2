import { NextRequest, NextResponse } from "next/server";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { transferBalance } from "@/lib/actions/wallet.actions";

export async function POST(req: NextRequest) {
  try {
    const user = await getLoggedInUser();
    if (!user || !user.$id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { receiverId, amount, description, receiverBankId } = await req.json();
    
    if (!receiverId || amount === undefined || !description) {
      return NextResponse.json(
        { error: "receiverId, amount, and description are required" },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    const result = await transferBalance({
      senderId: user.$id,
      receiverId: receiverId.trim(),
      receiverBankId: receiverBankId ? receiverBankId.trim() : undefined,
      amount: numAmount,
      description: description.trim(),
    });

    if (!result || !result.success) {
      return NextResponse.json({ error: result?.message || "Transfer failed" }, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "An error occurred during transfer" },
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
