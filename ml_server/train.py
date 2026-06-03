import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.cluster import KMeans
from sklearn.preprocessing import MinMaxScaler

def generate_synthetic_data(num_samples=10000, seed=42):
    np.random.seed(seed)
    
    # Số mẫu cho từng nhóm khẩu vị rủi ro để tạo phân phối rõ rệt
    n_con = int(num_samples * 0.35)  # 35% Thận trọng
    n_bal = int(num_samples * 0.40)  # 40% Cân bằng
    n_agr = num_samples - n_con - n_bal  # 25% Mạo hiểm
    
    # 1. Nhóm Thận trọng (Conservative) - Ít rủi ro, kỷ luật cao
    con_data = {
        'bill_on_time_ratio': np.clip(np.random.normal(0.95, 0.03, n_con), 0.0, 1.0),
        'social_sentiment': np.clip(np.random.normal(0.85, 0.08, n_con), 0.0, 1.0),
        'spend_discipline': np.clip(np.random.normal(0.90, 0.05, n_con), 0.0, 1.0),
        'balance_volatility': np.clip(np.random.normal(0.15, 0.05, n_con), 0.0, 1.0),
        'impulse_purchase_index': np.clip(np.random.normal(0.10, 0.05, n_con), 0.0, 1.0),
        'late_night_spend_ratio': np.clip(np.random.normal(0.05, 0.03, n_con), 0.0, 1.0),
        'immediate_cash_out_rate': np.clip(np.random.normal(0.05, 0.03, n_con), 0.0, 1.0),
        'income_regularity_index': np.clip(np.random.normal(0.90, 0.05, n_con), 0.0, 1.0),
        'liquidity_buffer_ratio': np.clip(np.random.normal(3.5, 0.5, n_con), 0.0, 5.0),
        'save_after_payday_ratio': np.clip(np.random.normal(0.40, 0.08, n_con), 0.0, 1.0),
        'auto_save_completion_rate': np.clip(np.random.normal(0.95, 0.03, n_con), 0.0, 1.0),
        'onboarding_attention_score': np.clip(np.random.normal(0.85, 0.08, n_con), 0.0, 1.0),
        'balance_check_frequency': np.clip(np.random.normal(2.0, 1.0, n_con), 0.0, 20.0),
        'p2p_network_density': np.clip(np.random.normal(3.0, 1.0, n_con), 0.0, 20.0),
        'low_battery_transaction': np.random.choice([0.0, 1.0], size=n_con, p=[0.95, 0.05])
    }
    
    # 2. Nhóm Cân bằng (Balanced) - Trung bình
    bal_data = {
        'bill_on_time_ratio': np.clip(np.random.normal(0.80, 0.08, n_bal), 0.0, 1.0),
        'social_sentiment': np.clip(np.random.normal(0.65, 0.10, n_bal), 0.0, 1.0),
        'spend_discipline': np.clip(np.random.normal(0.65, 0.10, n_bal), 0.0, 1.0),
        'balance_volatility': np.clip(np.random.normal(0.40, 0.10, n_bal), 0.0, 1.0),
        'impulse_purchase_index': np.clip(np.random.normal(0.35, 0.10, n_bal), 0.0, 1.0),
        'late_night_spend_ratio': np.clip(np.random.normal(0.15, 0.05, n_bal), 0.0, 1.0),
        'immediate_cash_out_rate': np.clip(np.random.normal(0.20, 0.08, n_bal), 0.0, 1.0),
        'income_regularity_index': np.clip(np.random.normal(0.75, 0.08, n_bal), 0.0, 1.0),
        'liquidity_buffer_ratio': np.clip(np.random.normal(2.0, 0.4, n_bal), 0.0, 5.0),
        'save_after_payday_ratio': np.clip(np.random.normal(0.20, 0.05, n_bal), 0.0, 1.0),
        'auto_save_completion_rate': np.clip(np.random.normal(0.75, 0.10, n_bal), 0.0, 1.0),
        'onboarding_attention_score': np.clip(np.random.normal(0.60, 0.15, n_bal), 0.0, 1.0),
        'balance_check_frequency': np.clip(np.random.normal(5.0, 2.0, n_bal), 0.0, 20.0),
        'p2p_network_density': np.clip(np.random.normal(6.0, 2.0, n_bal), 0.0, 20.0),
        'low_battery_transaction': np.random.choice([0.0, 1.0], size=n_bal, p=[0.85, 0.15])
    }
    
    # 3. Nhóm Mạo hiểm (Aggressive) - Chi tiêu bốc đồng, đệm mỏng
    agr_data = {
        'bill_on_time_ratio': np.clip(np.random.normal(0.45, 0.15, n_agr), 0.0, 1.0),
        'social_sentiment': np.clip(np.random.normal(0.40, 0.15, n_agr), 0.0, 1.0),
        'spend_discipline': np.clip(np.random.normal(0.35, 0.10, n_agr), 0.0, 1.0),
        'balance_volatility': np.clip(np.random.normal(0.75, 0.10, n_agr), 0.0, 1.0),
        'impulse_purchase_index': np.clip(np.random.normal(0.70, 0.10, n_agr), 0.0, 1.0),
        'late_night_spend_ratio': np.clip(np.random.normal(0.50, 0.10, n_agr), 0.0, 1.0),
        'immediate_cash_out_rate': np.clip(np.random.normal(0.65, 0.12, n_agr), 0.0, 1.0),
        'income_regularity_index': np.clip(np.random.normal(0.50, 0.15, n_agr), 0.0, 1.0),
        'liquidity_buffer_ratio': np.clip(np.random.normal(0.8, 0.3, n_agr), 0.0, 5.0),
        'save_after_payday_ratio': np.clip(np.random.normal(0.05, 0.03, n_agr), 0.0, 1.0),
        'auto_save_completion_rate': np.clip(np.random.normal(0.40, 0.15, n_agr), 0.0, 1.0),
        'onboarding_attention_score': np.clip(np.random.normal(0.25, 0.12, n_agr), 0.0, 1.0),
        'balance_check_frequency': np.clip(np.random.normal(12.0, 3.0, n_agr), 0.0, 20.0),
        'p2p_network_density': np.clip(np.random.normal(12.0, 3.0, n_agr), 0.0, 20.0),
        'low_battery_transaction': np.random.choice([0.0, 1.0], size=n_agr, p=[0.60, 0.40])
    }
    
    # Gom tất cả thành DataFrame
    df_con = pd.DataFrame(con_data)
    df_bal = pd.DataFrame(bal_data)
    df_agr = pd.DataFrame(agr_data)
    
    df = pd.concat([df_con, df_bal, df_agr], ignore_index=True)
    return df

def train_model():
    print("Step 1.1: Generating behavioral financial dataset (10,000 samples)...")
    df = generate_synthetic_data(num_samples=10000)
    
    # 1. Chuẩn hóa đặc trưng bằng MinMaxScaler trước khi phân cụm (tránh méo khoảng cách Euclid)
    feature_cols = [
        'bill_on_time_ratio', 'social_sentiment', 'spend_discipline',
        'balance_volatility', 'impulse_purchase_index', 'late_night_spend_ratio',
        'immediate_cash_out_rate', 'income_regularity_index', 'liquidity_buffer_ratio',
        'save_after_payday_ratio', 'auto_save_completion_rate', 'onboarding_attention_score',
        'balance_check_frequency', 'p2p_network_density', 'low_battery_transaction'
    ]
    
    scaler = MinMaxScaler()
    scaled_features = scaler.fit_transform(df[feature_cols])
    
    # 2. Chạy thuật toán phân cụm không giám sát KMeans (k = 3)
    print("Step 1.2: Running Unsupervised K-Means clustering (K=3)...")
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(scaled_features)
    
    # 3. Định nghĩa ý nghĩa tài chính cho từng cụm dựa trên centroids
    # Sử dụng chỉ số chịu rủi ro: score = spend_discipline + bill_on_time_ratio - impulse_purchase_index
    centroids = kmeans.cluster_centers_
    
    # Vị trí của các cột đặc trưng trong mảng scaled
    idx_discipline = feature_cols.index('spend_discipline')
    idx_bill = feature_cols.index('bill_on_time_ratio')
    idx_impulse = feature_cols.index('impulse_purchase_index')
    
    cluster_scores = []
    for idx, center in enumerate(centroids):
        # Tính điểm bảo thủ (kỷ luật cao + đóng hóa đơn tốt - bốc đồng)
        safety_score = center[idx_discipline] + center[idx_bill] - center[idx_impulse]
        cluster_scores.append((idx, safety_score))
    
    # Sắp xếp các cụm theo safety_score giảm dần:
    # Cao nhất -> Conservative (0)
    # Giữa -> Balanced (1)
    # Thấp nhất -> Aggressive (2)
    cluster_scores.sort(key=lambda x: x[1], reverse=True)
    
    cluster_mapping = {}
    cluster_mapping[cluster_scores[0][0]] = 0  # Conservative
    cluster_mapping[cluster_scores[1][0]] = 1  # Balanced
    cluster_mapping[cluster_scores[2][0]] = 2  # Aggressive
    
    print("Cluster mapping based on centroids safety score:")
    for rank, (c_id, score) in enumerate(cluster_scores):
        label = "Conservative (0)" if rank == 0 else "Balanced (1)" if rank == 1 else "Aggressive (2)"
        print(f"  Cluster {c_id} -> Safety Score: {score:.4f} -> Assigned to {label}")
        
    # Ánh xạ nhãn phân cụm thành nhãn rủi ro tài chính đích
    df['risk_appetite'] = [cluster_mapping[label] for label in cluster_labels]
    
    # 4. Huấn luyện bộ phân loại có giám sát XGBoost
    X = df[feature_cols]
    y = df['risk_appetite']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Step 1.3: Training XGBoost Classifier model on K-Means labels...")
    model = XGBClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42,
        eval_metric='mlogloss'
    )
    
    model.fit(X_train, y_train)
    
    # Đánh giá độ chính xác của bộ phân loại XGBoost so với phân cụm KMeans
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nXGBoost Classifier Accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # 5. Lưu mô hình và scaler
    model.save_model("risk_appetite_model.xgb")
    print("Model saved successfully as 'risk_appetite_model.xgb'.")
    
    # Lưu MinMaxScaler để Next.js backend hoặc predict sử dụng sau này nếu cần
    # (Để đơn giản, trong main.py chúng ta cũng có thể scale độc lập hoặc load scaler)
    import joblib
    joblib.dump(scaler, "scaler.joblib")
    print("Scaler saved successfully as 'scaler.joblib'.")

if __name__ == "__main__":
    train_model()
