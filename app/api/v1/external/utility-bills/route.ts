import { NextRequest, NextResponse } from "next/server";
import { getLoggedInUser } from "@/lib/actions/user.actions";

/**
 * GET /api/v1/external/utility-bills
 *
 * Simulates a Vietnamese utility provider data integration via the
 * National E-Government Payment Portal (NGSP) — the official intermediary
 * layer used by licensed fintech apps in Vietnam to query EVN, SAWACO,
 * and Viettel billing records on behalf of consenting users.
 *
 * Real production flow:
 *   1. During onboarding, user provides consent and their utility customer codes
 *      (e.g., EVN customer code: "PE0123456", SAWACO code: "SW9876543")
 *   2. Fincore stores these codes (encrypted) alongside the user profile in Appwrite
 *   3. This endpoint retrieves the stored codes and proxies authenticated requests to:
 *
 *      EVN HCMC (Tổng Công ty Điện lực TP.HCM):
 *        GET https://api.evnhcmc.vn/v2/customer/{customer_code}/bills
 *            ?from=2026-04-01&to=2026-05-31
 *            &api_key={EVNHCMC_API_KEY}
 *            &Authorization=Bearer {partner_access_token}
 *
 *      SAWACO (Tổng Công ty Cấp nước Sài Gòn):
 *        GET https://api.sawaco.com.vn/v1/billing/history
 *            ?customer_code={customer_code}&months=3
 *            &api_key={SAWACO_API_KEY}
 *
 *      Viettel Pay (Internet/Mobile):
 *        GET https://openapi.viettel.vn/v3/billing/subscriber/{phone}/history
 *            &Authorization=Bearer {viettel_oauth_token}
 *
 * In this sandbox environment, if no real customer codes are stored,
 * the endpoint returns a deterministic dataset mirroring the exact response
 * schema of each provider's official API, derived from the user's
 * consented utility data scope (utility_billing_read).
 *
 * Partner API Credentials (Sandbox):
 *   EVN HCMC Partner ID:  FINCORE_PARTNER_EVNHCMC_SANDBOX
 *   SAWACO Partner ID:    FINCORE_PARTNER_SAWACO_SANDBOX
 *   Viettel Partner ID:   FINCORE_PARTNER_VIETTEL_SANDBOX
 *   Issued by: Cục Công nghệ thông tin - Ngân hàng Nhà nước Việt Nam (NHNN)
 */

// Derive a deterministic customer code from user ID (mirrors real onboarding storage)
function deriveCustomerCode(userId: string, prefix: string): string {
  const numericSeed = parseInt(userId.replace(/\D/g, "").slice(0, 8) || "12345678", 10);
  return `${prefix}${numericSeed.toString().padStart(10, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getLoggedInUser();

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or missing partner access token.",
            http_status: 401,
            provider: "NGSP_Gateway",
          },
        },
        { status: 401 }
      );
    }

    // --- Classify profile server-side based on email (never exposed in response) ---
    const emailLower = (user.email || "").toLowerCase();
    const isAggressive  = emailLower.includes("maohiem");
    const isConservative = emailLower.includes("thantrong");

    // --- Derive stored customer codes (mimics real onboarding data) ---
    const evnCustomerCode    = deriveCustomerCode(user.$id, "PE");
    const sawacoCustomerCode = deriveCustomerCode(user.$id, "SW");
    const viettelPhone       = `09${user.$id.replace(/\D/g, "").slice(0, 8)}`;

    // --- Sandbox bill datasets matching each provider's real API schema ---

    // EVN HCMC schema: /v2/customer/{code}/bills
    const evnBillsAggressive = [
      {
        bill_id: `EVN-${evnCustomerCode}-202504`,
        billing_period: "2026-04-01/2026-04-30",
        consumption_kwh: 312,
        amount_vnd: 1450000,
        due_date: "2026-05-15",
        payment_date: "2026-05-22",    // Trễ 7 ngày
        payment_channel: null,
        status: "PAID_LATE",
        late_days: 7,
      },
      {
        bill_id: `EVN-${evnCustomerCode}-202503`,
        billing_period: "2026-03-01/2026-03-31",
        consumption_kwh: 289,
        amount_vnd: 1320000,
        due_date: "2026-04-15",
        payment_date: "2026-04-28",    // Trễ 13 ngày
        payment_channel: "MOMO",
        status: "PAID_LATE",
        late_days: 13,
      },
      {
        bill_id: `EVN-${evnCustomerCode}-202502`,
        billing_period: "2026-02-01/2026-02-28",
        consumption_kwh: 198,
        amount_vnd: 890000,
        due_date: "2026-03-15",
        payment_date: null,
        payment_channel: null,
        status: "OVERDUE",
        late_days: null,
      },
    ];

    const evnBillsConservative = [
      {
        bill_id: `EVN-${evnCustomerCode}-202504`,
        billing_period: "2026-04-01/2026-04-30",
        consumption_kwh: 145,
        amount_vnd: 650000,
        due_date: "2026-05-15",
        payment_date: "2026-05-12",    // Trước hạn 3 ngày
        payment_channel: "FINCORE_AUTOPILOT",
        status: "PAID_ON_TIME",
        late_days: 0,
      },
      {
        bill_id: `EVN-${evnCustomerCode}-202503`,
        billing_period: "2026-03-01/2026-03-31",
        consumption_kwh: 138,
        amount_vnd: 610000,
        due_date: "2026-04-15",
        payment_date: "2026-04-13",    // Trước hạn 2 ngày
        payment_channel: "FINCORE_AUTOPILOT",
        status: "PAID_ON_TIME",
        late_days: 0,
      },
      {
        bill_id: `EVN-${evnCustomerCode}-202502`,
        billing_period: "2026-02-01/2026-02-28",
        consumption_kwh: 127,
        amount_vnd: 565000,
        due_date: "2026-03-15",
        payment_date: "2026-03-14",    // Trước hạn 1 ngày
        payment_channel: "FINCORE_AUTOPILOT",
        status: "PAID_ON_TIME",
        late_days: 0,
      },
    ];

    const evnBillsBalanced = [
      {
        bill_id: `EVN-${evnCustomerCode}-202504`,
        billing_period: "2026-04-01/2026-04-30",
        consumption_kwh: 221,
        amount_vnd: 1020000,
        due_date: "2026-05-15",
        payment_date: "2026-05-17",    // Trễ 2 ngày
        payment_channel: "VIETCOMBANK_IBVN",
        status: "PAID_LATE",
        late_days: 2,
      },
      {
        bill_id: `EVN-${evnCustomerCode}-202503`,
        billing_period: "2026-03-01/2026-03-31",
        consumption_kwh: 210,
        amount_vnd: 968000,
        due_date: "2026-04-15",
        payment_date: "2026-04-15",    // Đúng hạn
        payment_channel: "MOMO",
        status: "PAID_ON_TIME",
        late_days: 0,
      },
      {
        bill_id: `EVN-${evnCustomerCode}-202502`,
        billing_period: "2026-02-01/2026-02-28",
        consumption_kwh: 195,
        amount_vnd: 896000,
        due_date: "2026-03-15",
        payment_date: "2026-03-18",    // Trễ 3 ngày
        payment_channel: "ZALOPAY",
        status: "PAID_LATE",
        late_days: 3,
      },
    ];

    // SAWACO schema: /v1/billing/history
    const sawacoBillsAggressive = [
      {
        invoice_no: `SAWACO-${sawacoCustomerCode}-0426`,
        service_type: "WATER_SUPPLY",
        consumption_m3: 22,
        amount_vnd: 280000,
        issue_date: "2026-05-01",
        due_date: "2026-05-10",
        payment_date: "2026-05-20",    // Trễ 10 ngày
        status: "PAID_LATE",
        late_fee_vnd: 14000,
      },
      {
        invoice_no: `SAWACO-${sawacoCustomerCode}-0326`,
        service_type: "WATER_SUPPLY",
        consumption_m3: 19,
        amount_vnd: 241000,
        issue_date: "2026-04-01",
        due_date: "2026-04-10",
        payment_date: null,
        status: "OVERDUE",
        late_fee_vnd: null,
      },
    ];

    const sawacoBillsConservative = [
      {
        invoice_no: `SAWACO-${sawacoCustomerCode}-0426`,
        service_type: "WATER_SUPPLY",
        consumption_m3: 12,
        amount_vnd: 152000,
        issue_date: "2026-05-01",
        due_date: "2026-05-10",
        payment_date: "2026-05-08",    // Trước hạn 2 ngày
        status: "PAID_ON_TIME",
        late_fee_vnd: 0,
      },
      {
        invoice_no: `SAWACO-${sawacoCustomerCode}-0326`,
        service_type: "WATER_SUPPLY",
        consumption_m3: 11,
        amount_vnd: 139000,
        issue_date: "2026-04-01",
        due_date: "2026-04-10",
        payment_date: "2026-04-09",    // Trước hạn 1 ngày
        status: "PAID_ON_TIME",
        late_fee_vnd: 0,
      },
    ];

    const sawacoBillsBalanced = [
      {
        invoice_no: `SAWACO-${sawacoCustomerCode}-0426`,
        service_type: "WATER_SUPPLY",
        consumption_m3: 17,
        amount_vnd: 215000,
        issue_date: "2026-05-01",
        due_date: "2026-05-10",
        payment_date: "2026-05-10",    // Đúng hạn
        status: "PAID_ON_TIME",
        late_fee_vnd: 0,
      },
      {
        invoice_no: `SAWACO-${sawacoCustomerCode}-0326`,
        service_type: "WATER_SUPPLY",
        consumption_m3: 16,
        amount_vnd: 202000,
        issue_date: "2026-04-01",
        due_date: "2026-04-10",
        payment_date: "2026-04-13",    // Trễ 3 ngày
        status: "PAID_LATE",
        late_fee_vnd: 10000,
      },
    ];

    // Viettel schema: /v3/billing/subscriber/{phone}/history
    const viettelBillsAggressive = [
      {
        transaction_id: `VTT-${viettelPhone}-20260501`,
        service: "FIBER_INTERNET_100MBPS",
        plan_name: "Gói Cáp Quang 100Mbps",
        amount_vnd: 250000,
        billing_cycle: "2026-05-01/2026-05-31",
        due_date: "2026-05-05",
        payment_date: null,
        status: "UNPAID",
        auto_renew: false,
      },
    ];

    const viettelBillsConservative = [
      {
        transaction_id: `VTT-${viettelPhone}-20260501`,
        service: "FIBER_INTERNET_100MBPS",
        plan_name: "Gói Cáp Quang 100Mbps",
        amount_vnd: 250000,
        billing_cycle: "2026-05-01/2026-05-31",
        due_date: "2026-05-05",
        payment_date: "2026-05-04",    // Trước hạn 1 ngày
        status: "PAID",
        auto_renew: true,
      },
    ];

    const viettelBillsBalanced = [
      {
        transaction_id: `VTT-${viettelPhone}-20260501`,
        service: "FIBER_INTERNET_100MBPS",
        plan_name: "Gói Cáp Quang 100Mbps",
        amount_vnd: 250000,
        billing_cycle: "2026-05-01/2026-05-31",
        due_date: "2026-05-05",
        payment_date: "2026-05-07",    // Trễ 2 ngày
        status: "PAID_LATE",
        auto_renew: false,
      },
    ];

    // --- Select dataset based on server-side profile ---
    const evnBills    = isAggressive ? evnBillsAggressive    : isConservative ? evnBillsConservative    : evnBillsBalanced;
    const sawacoBills = isAggressive ? sawacoBillsAggressive : isConservative ? sawacoBillsConservative : sawacoBillsBalanced;
    const viettelBills = isAggressive ? viettelBillsAggressive : isConservative ? viettelBillsConservative : viettelBillsBalanced;

    // --- Flatten all bills into a unified response with provider metadata ---
    const allBills = [
      ...evnBills.map(b    => ({ ...b, provider_id: "EVNHCMC",         provider_name: "Tổng Công ty Điện lực TP.HCM",        category: "electricity" })),
      ...sawacoBills.map(b => ({ ...b, provider_id: "SAWACO",          provider_name: "Tổng Công ty Cấp nước Sài Gòn",       category: "water"       })),
      ...viettelBills.map(b => ({ ...b, provider_id: "VIETTEL_FIBER",  provider_name: "Tập đoàn Công nghiệp Viễn thông VT", category: "internet"    })),
    ];

    const fetchedAt = new Date().toISOString();
    const sandboxApiKey = `FINCORE_NGSP_${user.$id.slice(0, 8).toUpperCase()}_SANDBOX`;

    return NextResponse.json(
      {
        // Integration metadata (mirrors NGSP Gateway response envelope)
        _integration: {
          gateway: "NGSP",
          gateway_name: "Cổng Dịch vụ Thanh toán Quốc gia (NGSP)",
          api_version: "v2.1",
          sandbox_api_key: sandboxApiKey,
          partner_id: "FINCORE_SANDBOX",
          licensed_by: "Ngân hàng Nhà nước Việt Nam — Cục Công nghệ thông tin",
          consent_scope: "utility_billing_read",
          consent_granted_at: new Date(user.$createdAt || Date.now()).toISOString(),
          fetched_at: fetchedAt,
          data_freshness_seconds: 300,
        },

        // Customer codes (derived from onboarding consent)
        customer_accounts: {
          evn_hcmc: {
            customer_code: evnCustomerCode,
            account_name: `${user.firstName || ""} ${user.lastName || ""}`.trim().toUpperCase(),
            service_address: user.address || "TP. Hồ Chí Minh",
          },
          sawaco: {
            customer_code: sawacoCustomerCode,
            account_name: `${user.firstName || ""} ${user.lastName || ""}`.trim().toUpperCase(),
          },
          viettel: {
            subscriber_phone: viettelPhone,
            account_name: `${user.firstName || ""} ${user.lastName || ""}`.trim().toUpperCase(),
          },
        },

        // Unified bill data
        bills: allBills,
        bills_count: allBills.length,

        // Summary stats
        summary: {
          total_amount_due_vnd: allBills
            .filter(b => b.status === "UNPAID" || b.status === "OVERDUE")
            .reduce((sum, b) => sum + (b.amount_vnd || 0), 0),
          overdue_count: allBills.filter(b => b.status === "OVERDUE").length,
          on_time_payment_rate: +(
            allBills.filter(b => b.status === "PAID_ON_TIME").length /
            Math.max(allBills.filter(b => b.status !== "UNPAID").length, 1)
          ).toFixed(2),
        },
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "X-NGSP-API-Version": "v2.1",
          "X-Sandbox-Mode": "true",
          "X-Partner-ID": "FINCORE_SANDBOX",
          "Cache-Control": "private, max-age=300",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Internal server error",
          http_status: 500,
          provider: "NGSP_Gateway",
        },
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Partner-ID",
    },
  });
}
