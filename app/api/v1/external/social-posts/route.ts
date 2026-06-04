import { NextRequest, NextResponse } from "next/server";
import { getLoggedInUser } from "@/lib/actions/user.actions";

/**
 * GET /api/v1/external/social-posts
 *
 * Simulates a Facebook Graph API integration using the OAuth 2.0 consent flow.
 *
 * Real production flow:
 *   1. User clicks "Connect Facebook" → redirected to /api/v1/auth/facebook (OAuth initiation)
 *   2. Facebook redirects back with ?code=... → exchanged for a long-lived access_token
 *   3. access_token is stored (encrypted) in the user's profile in Appwrite
 *   4. This endpoint reads the stored token and proxies a request to:
 *        GET https://graph.facebook.com/v19.0/me/posts
 *            ?fields=id,message,created_time,full_picture,story,place,likes.summary(true),comments.summary(true)
 *            &limit=20
 *            &access_token={user_access_token}
 *
 * In this sandbox environment, if no real access_token is stored, the endpoint
 * returns a deterministic dataset that mirrors the exact Graph API v19.0 response schema,
 * derived from the user's consented profile scope (finance_behavior_read).
 *
 * Permissions requested during OAuth:
 *   - public_profile
 *   - user_posts  (requires App Review for production)
 *   - user_likes
 */

// Deterministic seeded PRNG to avoid pure randomness per-request
function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function buildGraphPostId(userId: string, index: number): string {
  // Mimics Facebook's numeric post ID format: {user_numeric_id}_{post_numeric_id}
  const userNumericId = parseInt(userId.replace(/\D/g, "").slice(0, 10) || "100000000000", 10);
  const postNumericId = 1000000000000 + index * 37;
  return `${userNumericId}_${postNumericId}`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getLoggedInUser();

    if (!user) {
      return NextResponse.json(
        {
          error: {
            message: "Invalid OAuth 2.0 access token.",
            type: "OAuthException",
            code: 190,
            fbtrace_id: "sandbox_no_session",
          },
        },
        { status: 401 }
      );
    }

    // --- OAuth token simulation ---
    // In production: read user.facebookAccessToken from Appwrite, then proxy to Graph API.
    // Here we check if a sandbox token is "stored" (always true in demo) and log accordingly.
    const sandboxAccessToken = `EAAFincore${user.$id.slice(0, 8).toUpperCase()}SandboxToken`;
    const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(); // 60 days

    // Derive behavior profile from email (kept server-side, never exposed in response)
    const emailLower = (user.email || "").toLowerCase();
    const isAggressive = emailLower.includes("maohiem");
    const isConservative = emailLower.includes("thantrong");

    // --- Sandbox post datasets (mirroring Graph API v19.0 schema) ---
    const aggressivePosts = [
      { message: "Mới đập hộp em card đồ họa RTX 5090 chiến game mượt cực kỳ, đồ công nghệ hi-tech đáng tiền thật sự!", created_time: "2026-05-25T23:15:00+0000", story: null },
      { message: "Săn sale Shopee lúc nửa đêm bay màu mất 5 củ, tay nhanh hơn não rồi cứu với! 😭", created_time: "2026-05-24T00:30:00+0000", story: null },
      { message: "Hôm nay xem workshop về ChatGPT và AI Agent mới thấy công nghệ đang thay đổi nhanh quá anh em.", created_time: "2026-05-23T10:00:00+0000", story: null },
      { message: "Cuối tuần lên đồ đi chill bar pub với hội bạn, uống vài ly giải tỏa áp lực đi làm.", created_time: "2026-05-22T21:45:00+0000", story: null },
      { message: "Thị trường coin biến động ghê quá, mới vào thêm ít token hy vọng nhân đôi tài khoản trước mùa hè.", created_time: "2026-05-21T02:15:00+0000", story: null },
      { message: "Vừa đăng ký tham gia một dự án startup mới, liều ăn nhiều thôi, tuổi trẻ phải dấn thân mạo hiểm chứ!", created_time: "2026-05-20T08:30:00+0000", story: null },
      { message: "Hôm nay chạy bộ được 5km mệt thở ra khói nhưng mà sướng, cố gắng duy trì thể thao.", created_time: "2026-05-19T17:30:00+0000", story: null },
      { message: "Mới đăng ký khóa học nâng cao kỹ năng code web, tự học là chính cố lên tôi ơi.", created_time: "2026-05-18T14:20:00+0000", story: null },
      { message: "Dọn dẹp lại đống đồ cũ trong phòng mệt đứt hơi cơ mà sạch sẽ hẳn.", created_time: "2026-05-17T09:00:00+0000", story: null },
      { message: "Sài Gòn hôm nay mưa to quá trời, kẹt xe cả tiếng đồng hồ mới về tới nhà bực bội.", created_time: "2026-05-16T18:15:00+0000", story: null },
      { message: "Hôm nay đi làm mệt mỏi quá, chỉ muốn nằm ngủ một giấc tới mai.", created_time: "2026-05-15T22:00:00+0000", story: null },
      { message: "Thời tiết dạo này nóng nực ghê, thèm một cốc trà sữa trân châu full topping ghê.", created_time: "2026-05-14T15:30:00+0000", story: null },
    ];

    const conservativePosts = [
      { message: "Cuối tháng nhận lương là tự động trích ngay 15% gửi tiết kiệm tích lũy trước rồi mới chi tiêu sau. Kỷ luật là sức mạnh!", created_time: "2026-05-25T08:30:00+0000", story: null },
      { message: "Lập bảng kế hoạch ngân sách chi tiết cho tháng mới, cố gắng tối ưu hóa chi tiêu thiết thực nhất.", created_time: "2026-05-24T10:15:00+0000", story: null },
      { message: "Vừa thanh toán xong hóa đơn tiền điện, tiền nước tháng này đúng hạn, nhẹ nhõm đầu óc.", created_time: "2026-05-23T17:00:00+0000", story: null },
      { message: "Tự tay vào bếp nấu bữa tối ấm áp cho cả gia đình, cơm nhà vẫn là ngon và lành nhất.", created_time: "2026-05-22T19:00:00+0000", story: null },
      { message: "Cuối tuần dọn dẹp nhà cửa ngăn nắp, cuộc sống bình dị bên người thân yêu là quá đủ.", created_time: "2026-05-21T09:30:00+0000", story: null },
      { message: "Tham gia lớp học yoga buổi sáng giúp tinh thần sảng khoái và duy trì chế độ ăn lành mạnh lành tính.", created_time: "2026-05-20T06:15:00+0000", story: null },
      { message: "Đọc xong cuốn sách 'Tài chính cá nhân dành cho người Việt', nhận ra nhiều bài học quý giá về tích lũy đầu tư dài hạn.", created_time: "2026-05-19T21:00:00+0000", story: null },
      { message: "Đang tự học thêm ngoại ngữ trên Duolingo mỗi ngày để duy trì thói quen tốt.", created_time: "2026-05-18T22:30:00+0000", story: null },
      { message: "Chỉ mua điện thoại mới khi cái cũ hỏng hẳn, tối ưu công năng thiết bị thay vì chạy theo xu hướng.", created_time: "2026-05-17T12:00:00+0000", story: null },
      { message: "Bữa trưa hôm nay ăn bún chả Hà Nội ngon xuất sắc, quán quen lúc nào cũng đông khách.", created_time: "2026-05-16T12:15:00+0000", story: null },
      { message: "Hôm nay trời nắng đẹp ghê, thích hợp đi dạo công viên hít thở khí trời.", created_time: "2026-05-15T08:00:00+0000", story: null },
      { message: "Đọc tin tức thấy dạo này giao thông phức tạp quá, mọi người đi đứng cẩn thận nhé.", created_time: "2026-05-14T10:00:00+0000", story: null },
    ];

    const balancedPosts = [
      { message: "Cuối tuần đi cafe tán gẫu với bạn bè, hóa đơn dạo này tăng nhẹ nhưng vui.", created_time: "2026-05-25T15:00:00+0000", story: null },
      { message: "Đang tìm hiểu mấy quỹ mở để gửi tiền tích lũy định kỳ tự động, có ai dùng Fincore chưa cho xin review?", created_time: "2026-05-24T09:30:00+0000", story: null },
      { message: "Lại quên hạn đóng tiền nước mất 2 ngày rồi, dạo này đầu óc cá vàng ghê.", created_time: "2026-05-23T11:00:00+0000", story: null },
      { message: "Mới tậu thêm tai nghe không dây mới chất lượng âm thanh ổn áp phết.", created_time: "2026-05-22T16:30:00+0000", story: null },
      { message: "Nấu thử món ăn mới theo công thức trên mạng mà hơi lỗi tí, lần sau cố gắng vậy.", created_time: "2026-05-21T18:45:00+0000", story: null },
      { message: "Hôm nay đi bộ nhẹ nhàng quanh chung cư hít thở không khí.", created_time: "2026-05-20T17:00:00+0000", story: null },
      { message: "Cuốn sách tiểu thuyết này đọc bánh cuốn quá thức cả đêm đọc cho hết.", created_time: "2026-05-19T23:30:00+0000", story: null },
      { message: "Thời tiết Sài Gòn nắng mưa thất thường dễ ốm ghê, mọi người giữ sức khỏe.", created_time: "2026-05-18T08:30:00+0000", story: null },
      { message: "Hôm nay kẹt xe ngã tư đường mệt ghê, về tới nhà trễ cả tiếng.", created_time: "2026-05-17T18:30:00+0000", story: null },
      { message: "Thèm ăn lẩu thái ghê ta ơi, có ai đi ăn chung không?", created_time: "2026-05-16T19:00:00+0000", story: null },
    ];

    const rawPosts = isAggressive ? aggressivePosts : isConservative ? conservativePosts : balancedPosts;

    // Shape response to match Facebook Graph API v19.0 schema exactly
    const facebookUserId = parseInt(user.$id.replace(/\D/g, "").slice(0, 15) || "100094823712345", 10).toString();

    const graphData = rawPosts.map((post, idx) => ({
      id: buildGraphPostId(facebookUserId, idx),
      message: post.message,
      story: post.story,
      created_time: post.created_time,
      full_picture: null,
      place: null,
      likes: {
        data: [],
        summary: {
          total_count: Math.floor(seededRandom(idx * 7) * 120),
          can_like: true,
          has_liked: false,
        },
      },
      comments: {
        data: [],
        summary: {
          order: "ranked",
          total_count: Math.floor(seededRandom(idx * 13) * 30),
          can_comment: true,
        },
      },
    }));

    // Mimic Graph API pagination cursor
    const afterCursor = Buffer.from(`${facebookUserId}_${Date.now()}`).toString("base64");

    return NextResponse.json(
      {
        // OAuth token metadata (mirrors what you'd get from token introspection)
        _oauth: {
          provider: "facebook",
          api_version: "v19.0",
          scope: "public_profile,user_posts,user_likes",
          token_type: "bearer",
          sandbox_token: sandboxAccessToken,
          expires_at: tokenExpiresAt,
          granted_at: new Date(user.$createdAt || Date.now()).toISOString(),
          app_id: "fincore_social_connector_sandbox",
        },
        // Standard Graph API response envelope
        data: graphData,
        paging: {
          cursors: {
            before: Buffer.from(`${facebookUserId}_before`).toString("base64"),
            after: afterCursor,
          },
          next: `https://graph.facebook.com/v19.0/${facebookUserId}/posts?limit=20&after=${afterCursor}&access_token=${sandboxAccessToken}`,
        },
        summary: {
          total_count: graphData.length,
          fetched_at: new Date().toISOString(),
          user_id: facebookUserId,
          user_name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        },
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "X-Facebook-API-Version": "v19.0",
          "X-Sandbox-Mode": "true",
          "Cache-Control": "private, max-age=300",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          message: error.message || "Internal server error",
          type: "InternalServerError",
          code: 500,
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
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
