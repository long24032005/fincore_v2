import { NextRequest, NextResponse } from "next/server";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getUserAIData } from "@/lib/actions/local-ai-db";

export async function GET(req: NextRequest) {
  try {
    const user = await getLoggedInUser();
    if (!user || !user.$id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    // Lấy dữ liệu hồ sơ AI của user từ DB cục bộ
    const aiData = await getUserAIData(user.$id);
    const riskClass = aiData?.riskClass || "balanced";
    
    let allocation = [];
    let advice = "";
    let portfolioName = "";
    
    if (riskClass === "conservative") {
      portfolioName = "Bảo toàn Vốn & Thận trọng (Conservative)";
      allocation = [
        { fundName: "VLBF (VinaCapital Bonds)", type: "Bonds/Cash", percentage: 40, description: "Quỹ đầu tư trái phiếu bảo thịnh VinaCapital, lãi suất ổn định, thanh khoản cao." },
        { fundName: "TCBF (Techcombank Bonds)", type: "Bonds", percentage: 30, description: "Quỹ đầu tư trái phiếu Techcombank, rủi ro thấp." },
        { fundName: "SSIBF (SSI Bond Fund)", type: "Bonds", percentage: 20, description: "Quỹ trái phiếu SSI, an toàn cao, tối ưu hóa lợi nhuận ngắn và trung hạn." },
        { fundName: "VNM (Cổ phiếu Vinamilk)", type: "Stocks", percentage: 10, description: "Cổ phiếu sữa quốc dân, chi trả cổ tức cao và rủi ro cực thấp." }
      ];
      advice = "Mức độ chịu rủi ro của bạn ở mức Thận trọng do thu nhập biến động hoặc kỷ luật thanh toán hóa đơn chưa tối ưu. Chúng tôi khuyên bạn nên ưu tiên bảo toàn vốn bằng các quỹ trái phiếu và hũ tiết kiệm ngắn hạn.";
    } else if (riskClass === "aggressive") {
      portfolioName = "Tăng trưởng Mạo hiểm (Aggressive)";
      allocation = [
        { fundName: "VESAF (VinaCapital Equity)", type: "Stocks", percentage: 30, description: "Quỹ đầu tư cổ phiếu tiếp cận thị trường VinaCapital, tập trung cổ phiếu tăng trưởng cao." },
        { fundName: "VEOF (VinaCapital Opportunity Fund)", type: "Stocks", percentage: 20, description: "Quỹ đầu tư cổ phiếu triển vọng VinaCapital, tối ưu hóa lợi nhuận dài hạn từ doanh nghiệp lớn." },
        { fundName: "DCDS (Dragon Capital Stock)", type: "Stocks", percentage: 30, description: "Quỹ đầu tư năng động Dragon Capital, tối đa hóa lợi nhuận dài hạn." },
        { fundName: "HPG (Cổ phiếu Hòa Phát)", type: "Stocks", percentage: 10, description: "Cổ phiếu thép quốc dân, nhạy cảm chu kỳ kinh tế nhưng có tiềm năng bứt phá mạnh." },
        { fundName: "FPT (Cổ phiếu FPT)", type: "Stocks", percentage: 10, description: "Cổ phiếu công nghệ tăng trưởng mạnh mẽ, đón đầu xu thế chuyển đổi số." }
      ];
      advice = "Hồ sơ tài chính và kỷ luật thanh toán của bạn ở mức Xuất sắc. Bạn có sức đệm dòng tiền tốt và có thể tận dụng lợi thế tăng trưởng dài hạn của thị trường cổ phiếu để đạt lợi nhuận tối đa.";
    } else {
      // Balanced
      portfolioName = "Tăng trưởng Cân bằng (Balanced)";
      allocation = [
        { fundName: "TCBF (Techcombank Bonds)", type: "Bonds", percentage: 30, description: "Quỹ đầu tư trái phiếu Techcombank, nền tảng an toàn cho danh mục." },
        { fundName: "SSIBF (SSI Bond Fund)", type: "Bonds", percentage: 10, description: "Quỹ trái phiếu SSI giúp bảo vệ tài sản khỏi các biến động lớn." },
        { fundName: "DCDS (Dragon Capital Stock)", type: "Stocks", percentage: 20, description: "Quỹ đầu tư năng động Dragon Capital, gia tăng lợi nhuận từ cổ phiếu lớn." },
        { fundName: "SSISCA (SSI Sustainable Competitive Advantage)", type: "Stocks", percentage: 10, description: "Quỹ lợi thế cạnh tranh bền vững SSI, tập trung doanh nghiệp có nền tảng vững mạnh." },
        { fundName: "VESAF (VinaCapital Equity)", type: "Stocks", percentage: 20, description: "Quỹ đầu tư cổ phiếu tiếp cận thị trường VinaCapital, tìm kiếm cơ hội bứt phá." },
        { fundName: "FPT (Cổ phiếu FPT)", type: "Stocks", percentage: 10, description: "Cổ phiếu công nghệ đầu ngành, tăng trưởng bền vững qua các năm." }
      ];
      advice = "Hồ sơ tài chính cho thấy kỷ luật tốt và dòng tiền ổn định. Danh mục Cân bằng sẽ giúp bạn tối ưu hóa lợi nhuận từ cổ phiếu mà vẫn kiểm soát được rủi ro biến động nhờ phần đệm trái phiếu.";
    }

    return NextResponse.json({
      success: true,
      userId: user.$id,
      riskClass: riskClass,
      portfolioName: portfolioName,
      advice: advice,
      allocation: allocation
    }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch investment advice" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
