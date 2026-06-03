import { NextResponse } from "next/server";
import { getLoggedInUser } from "@/lib/actions/user.actions";

export async function GET() {
  try {
    const user = await getLoggedInUser();
    
    // Nếu chưa đăng nhập, trả về lỗi 401
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fullNameLower = `${user.firstName || ""} ${user.lastName || ""} ${user.email || ""}`.toLowerCase();
    
    let posts = [];
    
    // Giả lập dữ liệu mxh theo từng hồ sơ người dùng
    if (fullNameLower.includes("maohiem")) {
      // Hồ sơ rủi ro cao / Bốc đồng / Thích công nghệ, mạo hiểm, giải trí
      posts = [
        // 1. Công nghệ (Technology)
        { id: "p1", content: "Mới đập hộp em card đồ họa RTX 5090 chiến game mượt cực kỳ, đồ công nghệ hi-tech đáng tiền thật sự!", created_at: "2026-05-25T23:15:00Z" },
        { id: "p2", content: "Hôm nay xem workshop về ChatGPT và AI Agent mới thấy công nghệ đang thay đổi nhanh quá anh em.", created_at: "2026-05-23T10:00:00Z" },
        // 2. Giải trí & Tiêu dùng (Entertainment & Shopping)
        { id: "p3", content: "Săn sale Shopee lúc nửa đêm bay màu mất 5 củ, tay nhanh hơn não rồi cứu với! 😭", created_at: "2026-05-24T00:30:00Z" },
        { id: "p4", content: "Cuối tuần lên đồ đi chill bar pub với hội bạn, uống vài ly giải tỏa áp lực đi làm.", created_at: "2026-05-22T21:45:00Z" },
        // 3. Khởi nghiệp & Đầu tư mạo hiểm (Entrepreneurship & High-risk Investing)
        { id: "p5", content: "Thị trường coin biến động ghê quá, mới vào thêm ít token hy vọng nhân đôi tài khoản trước mùa hè.", created_at: "2026-05-21T02:15:00Z" },
        { id: "p6", content: "Vừa đăng ký tham gia một dự án startup mới, liều ăn nhiều thôi, tuổi trẻ phải dấn thân mạo hiểm chứ!", created_at: "2026-05-20T08:30:00Z" },
        // 4. Sức khỏe & Thể thao (Health & Sports)
        { id: "p7", content: "Hôm nay chạy bộ được 5km mệt thở ra khói nhưng mà sướng, cố gắng duy trì thể thao.", created_at: "2026-05-19T17:30:00Z" },
        // 5. Giáo dục & Phát triển bản thân (Education)
        { id: "p8", content: "Mới đăng ký khóa học nâng cao kỹ năng code web, tự học là chính cố lên tôi ơi.", created_at: "2026-05-18T14:20:00Z" },
        // 6. Gia đình & Đời sống (Family & Lifestyle)
        { id: "p9", content: "Dọn dẹp lại đống đồ cũ trong phòng mệt đứt hơi cơ mà sạch sẽ hẳn.", created_at: "2026-05-17T09:00:00Z" },
        // Nhiễu (Noisy posts - Đời sống thường nhật để thử thách thuật toán NLP)
        { id: "p10", content: "Sài Gòn hôm nay mưa to quá trời, kẹt xe cả tiếng đồng hồ mới về tới nhà bực bội.", created_at: "2026-05-16T18:15:00Z" },
        { id: "p11", content: "Hôm nay đi làm mệt mỏi quá, chỉ muốn nằm ngủ một giấc tới mai.", created_at: "2026-05-15T22:00:00Z" },
        { id: "p12", content: "Thời tiết dạo này nóng nực ghê, thèm một cốc trà sữa trân châu full topping ghê.", created_at: "2026-05-14T15:30:00Z" }
      ];
    } else if (fullNameLower.includes("thantrong")) {
      // Hồ sơ rủi ro thấp / An toàn / Tích lũy, gia đình, sức khỏe, học tập
      posts = [
        // 1. Kỷ luật tài chính & Tích lũy (Financial Discipline)
        { id: "p1", content: "Cuối tháng nhận lương là tự động trích ngay 15% gửi tiết kiệm tích lũy trước rồi mới chi tiêu sau. Kỷ luật là sức mạnh!", created_at: "2026-05-25T08:30:00Z" },
        { id: "p2", content: "Lập bảng kế hoạch ngân sách chi tiết cho tháng mới, cố gắng tối ưu hóa chi tiêu thiết thực nhất.", created_at: "2026-05-24T10:15:00Z" },
        { id: "p3", content: "Vừa thanh toán xong hóa đơn tiền điện, tiền nước tháng này đúng hạn, nhẹ nhõm đầu óc.", created_at: "2026-05-23T17:00:00Z" },
        // 2. Gia đình & Đời sống (Family & Lifestyle)
        { id: "p4", content: "Tự tay vào bếp nấu bữa tối ấm áp cho cả gia đình, cơm nhà vẫn là ngon và lành nhất.", created_at: "2026-05-22T19:00:00Z" },
        { id: "p5", content: "Cuối tuần dọn dẹp nhà cửa ngăn nắp, cuộc sống bình dị bên người thân yêu là quá đủ.",
created_at: "2026-05-21T09:30:00Z" },
        // 3. Sức khỏe & Thể thao (Health & Sports)
        { id: "p6", content: "Tham gia lớp học yoga buổi sáng giúp tinh thần sảng khoái và duy trì chế độ ăn lành mạnh lành tính.", created_at: "2026-05-20T06:15:00Z" },
        // 4. Giáo dục & Phát triển bản thân (Education)
        { id: "p7", content: "Đọc xong cuốn sách 'Tài chính cá nhân dành cho người Việt', nhận ra nhiều bài học quý giá về tích lũy đầu tư dài hạn.", created_at: "2026-05-19T21:00:00Z" },
        { id: "p8", content: "Đang tự học thêm ngoại ngữ trên Duolingo mỗi ngày để duy trì thói quen tốt.", created_at: "2026-05-18T22:30:00Z" },
        // 5. Công nghệ (Technology)
        { id: "p9", content: "Chỉ mua điện thoại mới khi cái cũ hỏng hẳn, tối ưu công năng thiết bị thay vì chạy theo xu hướng.", created_at: "2026-05-17T12:00:00Z" },
        // Nhiễu (Noisy posts)
        { id: "p10", content: "Bữa trưa hôm nay ăn bún chả Hà Nội ngon xuất sắc, quán quen lúc nào cũng đông khách.", created_at: "2026-05-16T12:15:00Z" },
        { id: "p11", content: "Hôm nay trời nắng đẹp ghê, thích hợp đi dạo công viên hít thở khí trời.", created_at: "2026-05-15T08:00:00Z" },
        { id: "p12", content: "Đọc tin tức thấy dạo này giao thông phức tạp quá, mọi người đi đứng cẩn thận nhé.", created_at: "2026-05-14T10:00:00Z" }
      ];
    } else {
      // Hồ sơ cân bằng (Mặc định)
      posts = [
        // Hỗn hợp cân bằng giữa các khía cạnh
        { id: "p1", content: "Cuối tuần đi cafe tán gẫu với bạn bè, hóa đơn dạo này tăng nhẹ nhưng vui.", created_at: "2026-05-25T15:00:00Z" },
        { id: "p2", content: "Đang tìm hiểu mấy quỹ mở để gửi tiền tích lũy định kỳ tự động, có ai dùng Fincore chưa cho xin review?", created_at: "2026-05-24T09:30:00Z" },
        { id: "p3", content: "Lại quên hạn đóng tiền nước mất 2 ngày rồi, dạo này đầu óc cá vàng ghê.", created_at: "2026-05-23T11:00:00Z" },
        { id: "p4", content: "Mới tậu thêm tai nghe không dây mới chất lượng âm thanh ổn áp phết.", created_at: "2026-05-22T16:30:00Z" },
        { id: "p5", content: "Nấu thử món ăn mới theo công thức trên mạng mà hơi lỗi tí, lần sau cố gắng vậy.", created_at: "2026-05-21T18:45:00Z" },
        { id: "p6", content: "Hôm nay đi bộ nhẹ nhàng quanh chung cư hít thở không khí.", created_at: "2026-05-20T17:00:00Z" },
        { id: "p7", content: "Cuốn sách tiểu thuyết này đọc bánh cuốn quá thức cả đêm đọc cho hết.", created_at: "2026-05-19T23:30:00Z" },
        // Nhiễu (Noisy posts)
        { id: "p8", content: "Thời tiết Sài Gòn nắng mưa thất thường dễ ốm ghê, mọi người giữ sức khỏe.", created_at: "2026-05-18T08:30:00Z" },
        { id: "p9", content: "Hôm nay kẹt xe ngã tư đường mệt ghê, về tới nhà trễ cả tiếng.", created_at: "2026-05-17T18:30:00Z" },
        { id: "p10", content: "Thèm ăn lẩu thái ghê ta ơi, có ai đi ăn chung không?", created_at: "2026-05-16T19:00:00Z" }
      ];
    }

    return NextResponse.json({
      success: true,
      platform: "facebook",
      user_id: user.userId || user.$id,
      posts_count: posts.length,
      posts: posts
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
