import os
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from xgboost import XGBClassifier
import numpy as np
import joblib
from sentence_transformers import SentenceTransformer

app = FastAPI(title="Fincore ML Server", description="FastAPI server for K-Means + XGBoost Risk Appetite Prediction")

# Khởi tạo mô hình NLP SentenceTransformer (Sử dụng paraphrase-multilingual-MiniLM-L12-v2 nhẹ, hiệu năng tốt tiếng Việt)
print("Loading SentenceTransformer model...")
nlp_model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
print("SentenceTransformer loaded.")

# Định nghĩa 7 Câu chủ đề mục tiêu (Target Anchor Sentences)
ANCHOR_SENTENCES = [
    "Tôi yêu thích công nghệ, thiết bị điện tử mới, máy tính, điện thoại, chơi game, công nghệ AI và đồ hi-tech.", # technology
    "Tôi thích chi tiêu mua sắm quần áo, ăn uống nhà hàng, đi chill bar pub với bạn bè, du lịch trải nghiệm cuộc sống.", # entertainment
    "Tôi quan tâm đến việc tiết kiệm tiền, đầu tư tài chính tích lũy, thanh toán các hóa đơn đúng hạn và lập kế hoạch ngân sách.", # discipline
    "Tôi quan tâm đến sức khỏe thể chất, chế độ ăn kiêng lành mạnh, đi tập gym, yoga, chạy bộ và lối sống lành mạnh.", # health
    "Tôi thích đọc sách, học các khóa học mới, phát triển bản thân, kỹ năng nghề nghiệp và học ngoại ngữ.", # education
    "Tôi đam mê khởi nghiệp kinh doanh, đầu tư chứng khoán mạo hiểm, coin, token, tìm kiếm cơ hội làm giàu nhanh từ thị trường.", # entrepreneurship
    "Tôi dành thời gian chăm sóc gia đình, dọn dẹp nhà cửa, nấu ăn cho người thân, cuộc sống bình dị ấm áp." # family
]

# Tính sẵn embeddings cho các câu chủ đề mục tiêu để tối ưu hiệu năng
ANCHOR_EMBEDDINGS = nlp_model.encode(ANCHOR_SENTENCES, convert_to_tensor=True)

class SocialPostsInput(BaseModel):
    posts: list[str] = Field(..., description="Danh sách các bài đăng mạng xã hội của khách hàng")

# Định nghĩa cấu trúc đầu vào với đầy đủ 15 đặc trưng hành vi
class RiskAppetiteFeatureInput(BaseModel):
    bill_on_time_ratio: float = Field(..., ge=0.0, le=1.0)
    social_sentiment: float = Field(..., ge=0.0, le=1.0)
    spend_discipline: float = Field(..., ge=0.0, le=1.0)
    balance_volatility: float = Field(..., ge=0.0, le=1.0)
    impulse_purchase_index: float = Field(..., ge=0.0, le=1.0)
    late_night_spend_ratio: float = Field(..., ge=0.0, le=1.0)
    immediate_cash_out_rate: float = Field(..., ge=0.0, le=1.0)
    income_regularity_index: float = Field(..., ge=0.0, le=1.0)
    liquidity_buffer_ratio: float = Field(..., ge=0.0, le=5.0)
    save_after_payday_ratio: float = Field(..., ge=0.0, le=1.0)
    auto_save_completion_rate: float = Field(..., ge=0.0, le=1.0)
    onboarding_attention_score: float = Field(..., ge=0.0, le=1.0)
    balance_check_frequency: float = Field(..., ge=0.0, le=20.0)
    p2p_network_density: float = Field(..., ge=0.0, le=20.0)
    low_battery_transaction: bool

# Khởi tạo mô hình và scaler
model = XGBClassifier()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "risk_appetite_model.xgb")
SCALER_PATH = os.path.join(BASE_DIR, "scaler.joblib")

if os.path.exists(MODEL_PATH):
    model.load_model(MODEL_PATH)
    print("XGBoost Risk Appetite model loaded successfully.")
else:
    print(f"Warning: {MODEL_PATH} not found. Please run train.py first.")

scaler = None
if os.path.exists(SCALER_PATH):
    scaler = joblib.load(SCALER_PATH)
    print("Scaler loaded successfully.")
else:
    print(f"Warning: {SCALER_PATH} not found. Scaler will not be applied.")

@app.post("/predict")
def predict_risk_appetite(features: RiskAppetiteFeatureInput):
    if not os.path.exists(MODEL_PATH):
        raise HTTPException(status_code=500, detail="XGBoost model file not found. Run training first.")
        
    # Tạo mảng dữ liệu đầu vào
    input_list = [
        features.bill_on_time_ratio,
        features.social_sentiment,
        features.spend_discipline,
        features.balance_volatility,
        features.impulse_purchase_index,
        features.late_night_spend_ratio,
        features.immediate_cash_out_rate,
        features.income_regularity_index,
        features.liquidity_buffer_ratio,
        features.save_after_payday_ratio,
        features.auto_save_completion_rate,
        features.onboarding_attention_score,
        features.balance_check_frequency,
        features.p2p_network_density,
        1.0 if features.low_battery_transaction else 0.0
    ]
    
    input_data = np.array([input_list])
    
    # Chuẩn hóa dữ liệu đầu vào bằng scaler nếu tồn tại
    if scaler is not None:
        try:
            input_data_scaled = scaler.transform(input_data)
        except Exception as e:
            print(f"Scaler transform error: {e}, using raw features.")
            input_data_scaled = input_data
    else:
        input_data_scaled = input_data
    
    try:
        # Dự đoán nhãn trực tiếp bằng XGBoost (0: Thận trọng, 1: Cân bằng, 2: Mạo hiểm)
        predicted_label = int(model.predict(input_data_scaled)[0])
        probabilities = model.predict_proba(input_data_scaled)[0]
        
        # Ánh xạ nhãn ra phân lớp rủi ro trực tiếp
        if predicted_label == 2:
            risk_class = "aggressive"
        elif predicted_label == 1:
            risk_class = "balanced"
        else:
            risk_class = "conservative"
            
        # Tính toán độ đóng góp đặc trưng (Feature Contributions dựa trên sự thay đổi xác suất của lớp được dự đoán)
        # Giá trị dương (+) thể hiện đặc trưng làm tăng khả năng xếp vào lớp này
        # Giá trị âm (-) thể hiện đặc trưng làm giảm khả năng xếp vào lớp này
        feature_keys = [
            "bill_on_time_ratio", "social_sentiment", "spend_discipline",
            "balance_volatility", "impulse_purchase_index", "late_night_spend_ratio",
            "immediate_cash_out_rate", "income_regularity_index", "liquidity_buffer_ratio",
            "save_after_payday_ratio", "auto_save_completion_rate", "onboarding_attention_score",
            "balance_check_frequency", "p2p_network_density", "low_battery_transaction"
        ]
        
        feature_means = [
            0.7657, 0.6557, 0.6639,
            0.4002, 0.3493, 0.2029,
            0.2601, 0.7403, 2.2263,
            0.2319, 0.7327, 0.5997,
            5.6900, 6.4439, 0.1793
        ]
        
        contributions = {}
        for idx, key in enumerate(feature_keys):
            modified_list = list(input_list)
            modified_list[idx] = feature_means[idx]
            
            modified_input = np.array([modified_list])
            if scaler is not None:
                try:
                    modified_input_scaled = scaler.transform(modified_input)
                except Exception:
                    modified_input_scaled = modified_input
            else:
                modified_input_scaled = modified_input
                
            try:
                mod_probs = model.predict_proba(modified_input_scaled)[0]
                # Đóng góp = xác suất của nhãn dự đoán thực tế - xác suất khi thay thế bằng trị trung bình
                contributions[key] = float(probabilities[predicted_label] - mod_probs[predicted_label])
            except Exception:
                contributions[key] = 0.0
            
        return {
            "success": True,
            "risk_class": risk_class,
            "probabilities": {
                "conservative": float(probabilities[0]),
                "balanced": float(probabilities[1]),
                "aggressive": float(probabilities[2])
            },
            "feature_contributions": contributions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-interests")
def analyze_user_interests(input_data: SocialPostsInput):
    try:
        if not input_data.posts or len(input_data.posts) == 0:
            return {
                "success": True,
                "interests": {
                    "technology": 0.1,
                    "entertainment": 0.1,
                    "discipline": 0.1,
                    "health": 0.1,
                    "education": 0.1,
                    "entrepreneurship": 0.1,
                    "family": 0.1
                }
            }
            
        # 1. Tính embeddings cho các bài đăng của user
        post_embeddings = nlp_model.encode(input_data.posts, convert_to_tensor=True)
        
        # Import torch để tính toán cosine similarity nhanh trên tensor
        import torch
        
        # Khởi tạo dict chứa kết quả 7 chủ đề
        topic_keys = ["technology", "entertainment", "discipline", "health", "education", "entrepreneurship", "family"]
        interests = {}
        
        # 2. Với mỗi chủ đề, tính cosine similarity với từng bài đăng
        # post_embeddings: (num_posts, embedding_dim)
        # ANCHOR_EMBEDDINGS: (7, embedding_dim)
        # Chuẩn hóa các vector
        post_norm = torch.nn.functional.normalize(post_embeddings, p=2, dim=1)
        anchor_norm = torch.nn.functional.normalize(ANCHOR_EMBEDDINGS, p=2, dim=1)
        
        # Tính tích vô hướng -> ma trận tương đồng (7, num_posts)
        sim_matrix = torch.matmul(anchor_norm, post_norm.T)
        
        # Duyệt qua từng chủ đề
        for idx, key in enumerate(topic_keys):
            topic_sims = sim_matrix[idx]  # Vector tương đồng của chủ đề này với mọi bài đăng
            
            # Lấy Top 3 bài đăng có độ tương đồng cao nhất
            top_vals, _ = torch.topk(topic_sims, min(3, len(input_data.posts)))
            
            # Tính trung bình cộng của Top 3 bài đăng này để làm điểm sở thích
            avg_score = float(torch.mean(top_vals).item())
            
            # Đảm bảo điểm số nằm trong khoảng [0.0, 1.0]
            interests[key] = max(0.0, min(1.0, avg_score))
            
        return {
            "success": True,
            "interests": interests
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/re-train")
def retrain_endpoint():
    try:
        from train import train_model
        train_model()
        # Nạp lại model và scaler
        if os.path.exists(MODEL_PATH):
            model.load_model(MODEL_PATH)
        if os.path.exists(SCALER_PATH):
            global scaler
            scaler = joblib.load(SCALER_PATH)
        return {"success": True, "message": "Model re-trained successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "healthy", "model_loaded": os.path.exists(MODEL_PATH), "scaler_loaded": os.path.exists(SCALER_PATH)}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
