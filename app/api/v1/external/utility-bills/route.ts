import { NextResponse } from "next/server";
import { getLoggedInUser } from "@/lib/actions/user.actions";

export async function GET() {
  try {
    const user = await getLoggedInUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const name = (user.firstName || "").toLowerCase();
    
    let bills = [];
    
    // Giả lập lịch sử đóng tiền nước/điện theo từng hồ sơ người dùng
    if (name.includes("nam")) {
      // Hồ sơ đóng tiền trễ liên tục (Rủi ro cao)
      bills = [
        { id: "b1", provider: "EVN HCMC", type: "electricity", amount: 1450000, due_date: "2026-05-15", payment_date: "2026-05-22", status: "paid" }, // trễ 7 ngày
        { id: "b2", provider: "SAWACO", type: "water", amount: 280000, due_date: "2026-05-10", payment_date: "2026-05-20", status: "paid" }, // trễ 10 ngày
        { id: "b3", provider: "Viettel Internet", type: "internet", amount: 250000, due_date: "2026-05-05", payment_date: null, status: "unpaid" } // trễ quá hạn chưa đóng
      ];
    } else if (name.includes("lan")) {
      // Hồ sơ trung bình (trễ nhẹ)
      bills = [
        { id: "b1", provider: "EVN HCMC", type: "electricity", amount: 1100000, due_date: "2026-05-15", payment_date: "2026-05-17", status: "paid" }, // trễ 2 ngày
        { id: "b2", provider: "SAWACO", type: "water", amount: 180000, due_date: "2026-05-10", payment_date: "2026-05-10", status: "paid" }, // đúng hạn
        { id: "b3", provider: "Viettel Internet", type: "internet", amount: 250000, due_date: "2026-05-05", payment_date: "2026-05-07", status: "paid" } // trễ 2 ngày
      ];
    } else {
      // Mặc định (Huy hoặc người dùng tốt): Luôn đúng hạn
      bills = [
        { id: "b1", provider: "EVN HCMC", type: "electricity", amount: 1200000, due_date: "2026-05-15", payment_date: "2026-05-12", status: "paid" }, // trước hạn 3 ngày
        { id: "b2", provider: "SAWACO", type: "water", amount: 150000, due_date: "2026-05-10", payment_date: "2026-05-08", status: "paid" }, // trước hạn 2 ngày
        { id: "b3", provider: "Viettel Internet", type: "internet", amount: 250000, due_date: "2026-05-05", payment_date: "2026-05-04", status: "paid" } // trước hạn 1 ngày
      ];
    }

    return NextResponse.json({
      success: true,
      provider: "evn_sawaco_viettel",
      user_id: user.userId,
      bills_count: bills.length,
      bills: bills
    }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
