import { NextRequest, NextResponse } from "next/server";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { 
  getUserAutomations, 
  addUserAutomation, 
  updateUserAutomation, 
  deleteUserAutomation 
} from "@/lib/actions/local-ai-db";

// 1. GET: Lấy danh sách các lệnh tự động
export async function GET(req: NextRequest) {
  try {
    const user = await getLoggedInUser();
    if (!user || !user.$id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await getUserAutomations(user.$id);
    return NextResponse.json({ success: true, automations: list }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST: Thêm mới một lệnh tự động
export async function POST(req: NextRequest) {
  try {
    const user = await getLoggedInUser();
    if (!user || !user.$id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { actionType, amount, destinationFund, cronExpression } = await req.json();

    if (!actionType || !amount || !destinationFund || !cronExpression) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const newAuto = await addUserAutomation(user.$id, {
      actionType,
      amount: Number(amount),
      destinationFund,
      cronExpression
    });

    return NextResponse.json({ success: true, automation: newAuto }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. PATCH: Cập nhật trạng thái bật/tắt (isActive)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getLoggedInUser();
    if (!user || !user.$id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, isActive } = await req.json();

    if (!id || isActive === undefined) {
      return NextResponse.json({ error: "id and isActive are required" }, { status: 400 });
    }

    const updated = await updateUserAutomation(user.$id, id, { isActive });
    if (!updated) {
      return NextResponse.json({ error: "Automation task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, automation: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETE: Xóa một lệnh tự động
export async function DELETE(req: NextRequest) {
  try {
    const user = await getLoggedInUser();
    if (!user || !user.$id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
    }

    const result = await deleteUserAutomation(user.$id, id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
