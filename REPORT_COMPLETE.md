# INVESTMENT PROPOSAL REPORT: FINCORE SMART E-WALLET PROJECT

**Submitted by:** Fincore Wallet Project Development Team  
**Date of Submission:** June 2026  
**Target Program:** UII Incubator / Dr. Ho's Incubator Application  
**Formatting Standard:** Font Times New Roman, Size 13, Line Spacing 1.5  

---
<!-- PAGE BREAK: PAGE 1 - COVER PAGE -->
<div style="page-break-after: always; text-align: center; font-family: 'Times New Roman', serif; line-height: 1.5; padding: 2cm;">
  <br><br>
  <h2 style="font-size: 16pt; font-weight: bold; margin-bottom: 0.5cm; text-transform: uppercase;">COMMITTEE FOR ENTREPRENEURSHIP AND INNOVATION</h2>
  <h3 style="font-size: 14pt; font-weight: normal; margin-bottom: 3cm; text-transform: uppercase;">INVESTMENT PROPOSAL FOR INCUBATION PROGRAM</h3>
  
  <br>
  <h1 style="font-size: 28pt; font-weight: bold; color: #10B981; margin-bottom: 0.5cm;">FINCORE WALLET</h1>
  <h2 style="font-size: 13pt; font-style: italic; color: #4B5563; margin-bottom: 4cm; line-height: 1.5;">
    "The First AI-Powered E-Wallet in Vietnam Analyzing Alternative Behavioral Data to Personalize Wealth Management Portfolios"
  </h2>
  
  <div style="text-align: left; margin-left: 2cm; font-size: 13pt; margin-bottom: 4cm;">
    <strong>Project Development Team Members:</strong><br>
    1. Nguyen Van Huy - Technical Lead & AI Architect<br>
    2. Le Hoang Nam - Financial Analyst & Business Developer<br>
    3. Tran Thi Mai Anh - UI/UX Designer & Frontend Developer<br>
  </div>
  
  <p style="font-size: 13pt; color: #4B5563;">Ho Chi Minh City, June 2026</p>
</div>

---
<!-- PAGE BREAK: PAGE 2 - TABLE OF CONTENTS & EXECUTIVE SUMMARY -->
<div style="page-break-after: always; font-family: 'Times New Roman', serif; line-height: 1.5; font-size: 13pt;">
  <h2 style="font-size: 16pt; font-weight: bold; border-bottom: 2px solid #E5E7EB; padding-bottom: 0.2cm; margin-top: 0;">TABLE OF CONTENTS</h2>
  <ul style="list-style-type: none; padding-left: 0; line-height: 1.8; font-size: 11pt;">
    <li><strong>EXECUTIVE SUMMARY</strong> <span style="float: right;">Page 2</span></li>
    <li><strong>PART 1: PROPRIETARY AI METHODOLOGIES</strong> <span style="float: right;">Page 3</span></li>
    <li style="padding-left: 0.5cm;">1.1 Alternative Data Sources <span style="float: right;">Page 3</span></li>
    <li style="padding-left: 0.5cm;">1.2 Feature Engineering (15 Behavioral Features) <span style="float: right;">Page 4</span></li>
    <li style="padding-left: 0.5cm;">1.3 Hybrid Machine Learning Pipeline (K-Means & XGBoost) <span style="float: right;">Page 5</span></li>
    <li style="padding-left: 0.5cm;">1.4 Portfolio Matching & Gemini ReAct Agent <span style="float: right;">Page 5</span></li>
    <li><strong>PART 2: CUSTOM INFRASTRUCTURE ARCHITECTURE</strong> <span style="float: right;">Page 6</span></li>
    <li style="padding-left: 0.5cm;">2.1 The Limitations of Global Fintech Infrastructure in Vietnam <span style="float: right;">Page 6</span></li>
    <li style="padding-left: 0.5cm;">2.2 Custom OpenAPI Specification and Endpoint Design <span style="float: right;">Page 7</span></li>
    <li style="padding-left: 0.5cm;">2.3 Endpoint Classification and VND Localization <span style="float: right;">Page 7</span></li>
    <li style="padding-left: 0.5cm;">2.4 System Architecture and Uptime Security <span style="float: right;">Page 8</span></li>
    <li><strong>PART 3: COMMERCIAL SCALING ROADMAP</strong> <span style="float: right;">Page 9</span></li>
    <li style="padding-left: 0.5cm;">3.1 Market Opportunity (TAM) and Competitive Moat <span style="float: right;">Page 9</span></li>
    <li style="padding-left: 0.5cm;">3.2 Business Model and Revenue Streams <span style="float: right;">Page 10</span></li>
    <li style="padding-left: 0.5cm;">3.3 Product Roadmap and Allocation of Funds <span style="float: right;">Page 10</span></li>
  </ul>
  
  <br>
  <h2 style="font-size: 16pt; font-weight: bold; border-bottom: 2px solid #E5E7EB; padding-bottom: 0.2cm;">EXECUTIVE SUMMARY</h2>
  <p style="text-align: justify; text-indent: 1.2cm;">
    Fincore Wallet is an innovative smart e-wallet designed specifically for the Vietnamese digital generation. It addresses two critical bottlenecks of the domestic financial ecosystem: first, the lack of credit history for over 70% of young adults under 30 (who are excluded from traditional credit scoring); second, the incompatibility of global payment frameworks like Plaid, Stripe, or Dwolla with Vietnamese Dong (VND) transactions and local KYC regulations under the State Bank of Vietnam (SBV).
  </p>
  <p style="text-align: justify; text-indent: 1.2cm;">
    Our solution consists of a custom-built, VND-native OpenAPI Server paired with a proprietary AI risk scoring engine. By analyzing alternative behavioral data (social media sentiment and utility bill histories) under explicit user consent, Fincore extracts 15 core financial discipline features. We deploy a hybrid machine learning pipeline (K-Means auto-labeling and real-time XGBoost) to classify risk appetites and dynamically match users with open-ended funds, explained interactively by a Gemini AI agent. Fincore is applying to UII and Dr. Ho's Incubators to accelerate development and launch pilots with Vietnam's leading asset management firms.
  </p>
</div>

---
<!-- PAGE BREAK: PAGE 3 - PROPRIETARY AI - ALTERNATIVE DATA -->
<div style="page-break-after: always; font-family: 'Times New Roman', serif; line-height: 1.5; font-size: 13pt;">
  <h2 style="font-size: 16pt; font-weight: bold; color: #10B981; border-bottom: 2px solid #E5E7EB; padding-bottom: 0.2cm; margin-top: 0;">
    PART 1: PROPRIETARY AI METHODOLOGIES
  </h2>
  
  <h3 style="font-size: 14pt; font-weight: bold; margin-top: 0.5cm;">1.1 Alternative Data Sources</h3>
  <p style="text-align: justify; text-indent: 1.2cm;">
    Traditional financial institutions in Vietnam assess risk using static, self-reported surveys, which suffer from user bias. Fincore establishes a defensible data moat by collecting objective, real-time alternative data from three core channels to construct a high-fidelity behavior model:
  </p>
  <p style="text-align: justify; text-indent: 1.2cm;">
    <strong>Source 1 - Social Media:</strong> With explicit user consent via OAuth 2.0, Fincore integrates with Facebook Graph API v19.0 to pull public posts. Our NLP models analyze text sentiment and categorize interests across 7 dimensions (Technology, Entertainment, Discipline, Health, Education, Entrepreneurship, Family). This provides an understanding of user interests and lifestyle orientations.
  </p>
  <p style="text-align: justify; text-indent: 1.2cm;">
    <strong>Source 2 - Utility Bills:</strong> Integrating simulated endpoints representing Vietnam's national utility network (EVN/SAWACO) via the NGSP Gateway, Fincore tracks payment histories. On-time or late bill payments serve as the single most objective proxy for a user's real-world financial discipline and debt obligation reliability.
  </p>
  <p style="text-align: justify; text-indent: 1.2cm;">
    <strong>Source 3 - Internal Wallet Transactions:</strong> Stored securely in a self-hosted Appwrite DB, we track transaction timestamps (late-night vs. business hours), cash-out velocity post-deposit, and balance volatility. This provides granular insight into spending behaviors without relying on external credit bureaus.
  </p>
</div>

---
<!-- PAGE BREAK: PAGE 4 - PROPRIETARY AI - FEATURE ENGINEERING -->
<div style="page-break-after: always; font-family: 'Times New Roman', serif; line-height: 1.5; font-size: 13pt;">
  <h3 style="font-size: 14pt; font-weight: bold; margin-top: 0;">1.2 Feature Engineering (15 Behavioral Features)</h3>
  <p style="text-align: justify; text-indent: 1.2cm;">
    Raw transactional and social data are engineered into 15 distinct behavioral features. These variables are calculated dynamically using mathematical formulations (ratios, volatility, and counts) to construct a comprehensive financial discipline index:
  </p>
  
  <table style="width: 100%; border-collapse: collapse; margin-top: 0.5cm; font-size: 10.5pt; font-family: 'Times New Roman', serif; border: 1px solid #D1D5DB;">
    <thead>
      <tr style="background-color: #10B981; color: white; text-align: left;">
        <th style="padding: 10px; border: 1px solid #D1D5DB; font-weight: bold; width: 25%;">Feature Group</th>
        <th style="padding: 10px; border: 1px solid #D1D5DB; font-weight: bold; width: 25%;">Technical Variable Names</th>
        <th style="padding: 10px; border: 1px solid #D1D5DB; font-weight: bold; width: 50%;">Behavioral Definition & Financial Significance</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px; border: 1px solid #D1D5DB; font-weight: bold;">Financial Discipline</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB; font-family: monospace;">bill_on_time_ratio<br>spend_discipline<br>save_after_payday_ratio<br>auto_save_completion_rate</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB;">Measures the ratio of utility bills paid on time, essential spending vs total spending, savings initiated within 48 hours of payday, and the completion rate of scheduled autopilot transactions.</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #D1D5DB; font-weight: bold;">Impulse Spending</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB; font-family: monospace;">impulse_purchase_index<br>late_night_spend_ratio<br>immediate_cash_out_rate</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB;">Tracks purchase frequency outside business hours (late-night e-commerce sales), transactions occurring between 11 PM and 5 AM, and the speed of withdrawing money after deposit.</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #D1D5DB; font-weight: bold;">Financial Capacity</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB; font-family: monospace;">income_regularity_index<br>liquidity_buffer_ratio<br>balance_volatility</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB;">Evaluates the consistency of income sources, the liquidity buffer ratio (days of survival based on wallet balance), and standard deviation of weekly balance changes.</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #D1D5DB; font-weight: bold;">Digital Footprint</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB; font-family: monospace;">social_sentiment<br>onboarding_attention_score<br>balance_check_frequency<br>p2p_network_density<br>low_battery_transaction</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB;">Analyzes positive sentiment on social media, time spent reading risk terms, balance checking frequency, unique P2P transaction partners, and checkout behavior when device battery is under 20%.</td>
      </tr>
    </tbody>
  </table>
</div>

---
<!-- PAGE BREAK: PAGE 5 - PROPRIETARY AI - ML & PORTFOLIO -->
<div style="page-break-after: always; font-family: 'Times New Roman', serif; line-height: 1.5; font-size: 13pt;">
  <h3 style="font-size: 14pt; font-weight: bold; margin-top: 0;">1.3 Hybrid Machine Learning Pipeline (K-Means & XGBoost)</h3>
  <p style="text-align: justify; text-indent: 1.2cm;">
    To solve the cold-start problem of unlabeled user data, Fincore employs a hybrid machine learning pipeline. In the offline phase, historical behavioral features are normalized using MinMaxScaler, then clustered using K-Means (K=3). Clusters are auto-labeled as Conservative, Balanced, or Aggressive based on a custom Safety Score (Discipline - Impulse). In the online phase, a real-time XGBoost Classifier uses these labels to predict the risk group of new users, outputting probability distributions to calculate an Expected Risk Score:
  </p>
  <div style="text-align: center; margin: 0.5cm 0; font-weight: bold; background-color: #F3F4F6; padding: 0.3cm; border-radius: 8px;">
    E(Risk) = P(Conservative) × 0.1 + P(Balanced) × 0.5 + P(Aggressive) × 0.9
  </div>
  
  <h3 style="font-size: 14pt; font-weight: bold; margin-top: 0.8cm;">1.4 Portfolio Matching & Gemini ReAct Agent</h3>
  <p style="text-align: justify; text-indent: 1.2cm;">
    Using E(Risk) and the 7-dimensional interest vector, a Double-Matching Algorithm evaluates open-ended funds and equities in Vietnam. It computes Cosine Similarity between user interests and product DNA, multiplying it by the risk rating (final_score = interest_score * risk_score) to dynamically allocate top 5 assets. This allocation is passed to Gemini 2.5 Flash, which operates in a ReAct loop with 13 custom API tools (e.g., check balance, transfer, manage autopilot). The agent explains the investment logic in natural language, requiring user confirmation via interactive cards for all transaction executions.
  </p>
</div>

---
<!-- PAGE BREAK: PAGE 6 - CUSTOM INFRASTRUCTURE - LIMITATIONS -->
<div style="page-break-after: always; font-family: 'Times New Roman', serif; line-height: 1.5; font-size: 13pt;">
  <h2 style="font-size: 16pt; font-weight: bold; color: #10B981; border-bottom: 2px solid #E5E7EB; padding-bottom: 0.2cm; margin-top: 0;">
    PART 2: CUSTOM INFRASTRUCTURE ARCHITECTURE
  </h2>
  
  <h3 style="font-size: 14pt; font-weight: bold; margin-top: 0.5cm;">2.1 The Limitations of Global Fintech Infrastructure in Vietnam</h3>
  <p style="text-align: justify; text-indent: 1.2cm;">
    Standard financial infrastructure templates (Plaid, Stripe, Dwolla) are unusable for the Vietnamese market due to three main issues:
  </p>
  <p style="text-align: justify; padding-left: 0.5cm; margin-bottom: 0.5cm;">
    <strong>1. Incompatibility with VND:</strong> Plaid and Dwolla rely on ACH and USD networks, meaning they cannot connect natively to NAPAS or local bank accounts in Vietnam. Currency conversion fees and settlement delays make them impractical for daily use.<br>
    <strong>2. Incompatible KYC/eKYC Standards:</strong> Global platforms require Social Security Numbers (SSN) or credit bureau checks. Vietnam requires Citizen Identity Cards (CCCD 12-digit format) and matching mobile subscriber databases.<br>
    <strong>3. Data Sovereignty Compliance:</strong> Transferring Vietnamese citizen transaction logs to foreign cloud servers violates Vietnam's Cyber Security Law and State Bank regulations on data storage.
  </p>
  <p style="text-align: justify; text-indent: 1.2cm;">
    Fincore resolves this by building a custom-designed, VND-native OpenAPI 3.0.3 Server. It serves as a local ledger, handling secure wallet-to-wallet and wallet-to-bank transactions instantly with zero fees, documented interactively at `/api-docs`.
  </p>
</div>

---
<!-- PAGE BREAK: PAGE 7 - CUSTOM INFRASTRUCTURE - API ENDPOINTS -->
<div style="page-break-after: always; font-family: 'Times New Roman', serif; line-height: 1.5; font-size: 13pt;">
  <h3 style="font-size: 14pt; font-weight: bold; margin-top: 0;">2.2 Endpoint Classification and VND Localization</h3>
  <p style="text-align: justify; text-indent: 1.2cm;">
    Our custom API architecture groups endpoints into structured categories that align with the user journey. All transactions utilize the vi-VN locale, displaying currency as VND (e.g., 50,000,000 ₫). Safety gates restrict transfers to 50M ₫ per transaction and 100M ₫ per day to satisfy AML compliance:
  </p>
  
  <table style="width: 100%; border-collapse: collapse; margin-top: 0.5cm; font-size: 9.5pt; font-family: 'Times New Roman', serif; border: 1px solid #D1D5DB;">
    <thead>
      <tr style="background-color: #10B981; color: white; text-align: left;">
        <th style="padding: 8px; border: 1px solid #D1D5DB; font-weight: bold; width: 30%;">Method & Path</th>
        <th style="padding: 8px; border: 1px solid #D1D5DB; font-weight: bold; width: 25%;">Function Group</th>
        <th style="padding: 8px; border: 1px solid #D1D5DB; font-weight: bold; width: 45%;">Description & Parameters</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 6px; border: 1px solid #D1D5DB; font-family: monospace;">POST /api/v1/auth/signup<br>POST /api/v1/auth/signin</td>
        <td style="padding: 6px; border: 1px solid #D1D5DB; font-weight: bold;">Authentication</td>
        <td style="padding: 6px; border: 1px solid #D1D5DB;">Registers new users with CCCD/SĐT, initializes starting balance, and establishes login sessions.</td>
      </tr>
      <tr>
        <td style="padding: 6px; border: 1px solid #D1D5DB; font-family: monospace;">GET /api/v1/banks<br>POST /api/v1/banks</td>
        <td style="padding: 6px; border: 1px solid #D1D5DB; font-weight: bold;">Local Bank Integration</td>
        <td style="padding: 6px; border: 1px solid #D1D5DB;">Retrieves linked Vietnamese bank accounts and processes new direct local bank linkages.</td>
      </tr>
      <tr>
        <td style="padding: 6px; border: 1px solid #D1D5DB; font-family: monospace;">POST /api/v1/transfers</td>
        <td style="padding: 6px; border: 1px solid #D1D5DB; font-weight: bold;">VND Transactions</td>
        <td style="padding: 6px; border: 1px solid #D1D5DB;">Executes wallet-to-wallet or wallet-to-bank fund transfers. Formats currency via vi-VN locale (₫).</td>
      </tr>
      <tr>
        <td style="padding: 6px; border: 1px solid #D1D5DB; font-family: monospace;">GET /api/v1/automations</td>
        <td style="padding: 6px; border: 1px solid #D1D5DB; font-weight: bold;">Autopilot Investment</td>
        <td style="padding: 6px; border: 1px solid #D1D5DB;">Manages automated, scheduled saving rules for periodic mutual fund acquisitions.</td>
      </tr>
      <tr>
        <td style="padding: 6px; border: 1px solid #D1D5DB; font-family: monospace;">GET /api/v1/alternative-data/risk-appetite</td>
        <td style="padding: 6px; border: 1px solid #D1D5DB; font-weight: bold;">AI Engine Pipeline</td>
        <td style="padding: 6px; border: 1px solid #D1D5DB;">Evaluates alternative behavioral features and predicts risk appetite category.</td>
      </tr>
      <tr>
        <td style="padding: 6px; border: 1px solid #D1D5DB; font-family: monospace;">GET /api/v1/external/utility-bills<br>GET /api/v1/external/social-posts</td>
        <td style="padding: 6px; border: 1px solid #D1D5DB; font-weight: bold;">External Connectors</td>
        <td style="padding: 6px; border: 1px solid #D1D5DB;">Retrieves utility invoices (EVN/SAWACO) and syncs Facebook Graph API posts.</td>
      </tr>
    </tbody>
  </table>
</div>

---
<!-- PAGE BREAK: PAGE 8 - CUSTOM INFRASTRUCTURE - DIAGRAM -->
<div style="page-break-after: always; font-family: 'Times New Roman', serif; line-height: 1.5; font-size: 13pt;">
  <h3 style="font-size: 14pt; font-weight: bold; margin-top: 0;">2.3 System Architecture and Uptime Security</h3>
  <p style="text-align: justify; text-indent: 1.2cm;">
    Fincore is designed as a decoupled microservices architecture, separating frontend rendering from ML computing. The complete system layout and data routing flows are detailed in the diagram below:
  </p>
  
  <div style="text-align: center; margin: 0.5cm 0; font-family: monospace; font-size: 9.5pt; line-height: 1.2; background-color: #111827; color: #10B981; padding: 0.4cm; border-radius: 8px; border: 1px solid #374151;">
    <pre style="margin: 0; text-align: left;">
┌────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND — Next.js 14 (App Router)                   │
│         User Interface · Chatbot Window · Swagger API Explorer         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API / Server Actions
┌───────────────────────────────────▼────────────────────────────────────┐
│               FINCORE CUSTOM OPENAPI SERVER (/api/v1)                  │
│       Node.js / Express Core · Token Management & Local Ledger Core        │
└─────────────┬──────────────────────────────────────────┬───────────────┘
              │                                          │
┌─────────────▼─────────────┐              ┌─────────────▼───────────────┐
│       Appwrite DB         │              │      FastAPI ML Server       │
│  (Quản lý User, Wallet,   │              │   - Phân cụm K-Means         │
│   Transactions, Banks)    │              │   - Phân loại XGBoost        │
└─────────────┬─────────────┘              │   - Phân tích NLP sở thích   │
              │                            └─────────────┬───────────────┘
              │                                          │
┌─────────────▼──────────────────────────────────────────▼───────────────┐
│                         External Connectors                            │
│  Facebook Graph API v19.0 consent  ·  EVN/SAWACO NGSP Portal Gateway   │
│                 ↕ Gemini API (8 keys, auto-rotation)                   │
└────────────────────────────────────────────────────────────────────────┘
    </pre>
  </div>
  
  <p style="text-align: justify; text-indent: 1.2cm; margin-top: 0.5cm;">
    To ensure maximum uptime, we implement an API Key Rotation mechanism for the Gemini API. The server automatically rotates through 8 active API keys, switching keys in under 50ms upon hitting rate limits, guaranteeing 99.9% chatbot uptime. Additionally, our self-hosted Appwrite instance stores all sensitive ledger logs locally, assuring compliance with Vietnam's national data residency requirements.
  </p>
</div>

---
<!-- PAGE BREAK: PAGE 9 - COMMERCIAL ROADMAP - OPPORTUNITY -->
<div style="page-break-after: always; font-family: 'Times New Roman', serif; line-height: 1.5; font-size: 13pt;">
  <h2 style="font-size: 16pt; font-weight: bold; color: #10B981; border-bottom: 2px solid #E5E7EB; padding-bottom: 0.2cm; margin-top: 0;">
    PART 3: COMMERCIAL SCALING ROADMAP
  </h2>
  
  <h3 style="font-size: 14pt; font-weight: bold; margin-top: 0.5cm;">3.1 Market Opportunity (TAM) and Competitive Moat</h3>
  <p style="text-align: justify; text-indent: 1.2cm;">
    According to the **e-Conomy SEA 2025** report by Google, Temasek, and Bain & Company (link: [economysea.withgoogle.com](https://economysea.withgoogle.com)), Vietnam's digital economy Gross Merchandise Value (GMV) will reach $39B in 2025, growing at 17% annually. Digital payment transactions in Vietnam are projected to hit $178B in 2025. Over 87% of adults have bank accounts, and smartphone penetration exceeds 84% as of 2025 (NHNN statistics). Fincore targets the underserved Gen Z wealth management market. Our competitive moat relies on proprietary alternative data scoring, ReAct chatbot agents, and automated autopilot investments:
  </p>
  
  <table style="width: 100%; border-collapse: collapse; margin-top: 0.5cm; font-size: 10.5pt; font-family: 'Times New Roman', serif; border: 1px solid #D1D5DB;">
    <thead>
      <tr style="background-color: #10B981; color: white; text-align: left;">
        <th style="padding: 10px; border: 1px solid #D1D5DB; font-weight: bold; width: 25%;">Feature Comparison</th>
        <th style="padding: 10px; border: 1px solid #D1D5DB; font-weight: bold; width: 35%;">Fincore Wallet</th>
        <th style="padding: 10px; border: 1px solid #D1D5DB; font-weight: bold; width: 20%;">MoMo</th>
        <th style="padding: 10px; border: 1px solid #D1D5DB; font-weight: bold; width: 20%;">VNPay</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px; border: 1px solid #D1D5DB; font-weight: bold;">AI Alternative Scoring</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB; color: #10B981; font-weight: bold;">Proprietary K-Means & XGBoost</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB;">No (Traditional scores only)</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB;">No alternative scoring</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #D1D5DB; font-weight: bold;">Personalized Portfolios</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB; color: #10B981; font-weight: bold;">Cosine Similarity & Gemini Agent</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB;">Static fund packages suggested</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB;">No portfolio services</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #D1D5DB; font-weight: bold;">Autopilot Saving Rules</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB; color: #10B981; font-weight: bold;">Cron-based automated investments</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB;">Auto-debit bills only</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB;">No investment automation</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #D1D5DB; font-weight: bold;">Custom OpenAPI Ledger</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB; color: #10B981; font-weight: bold;">OpenAPI Spec 3.0.3 Native</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB;">Third-party bank APIs</td>
        <td style="padding: 8px; border: 1px solid #D1D5DB;">NAPAS-integrated API only</td>
      </tr>
    </tbody>
  </table>
</div>

---
<!-- PAGE BREAK: PAGE 10 - COMMERCIAL ROADMAP - BIZ MODEL -->
<div style="page-break-after: always; font-family: 'Times New Roman', serif; line-height: 1.5; font-size: 13pt;">
  <h3 style="font-size: 14pt; font-weight: bold; margin-top: 0;">3.2 Business Model and Revenue Streams</h3>
  <p style="text-align: justify; text-indent: 1.2cm;">
    Our business model relies on four main streams: Merchant payment processing fees (1.2% - 1.5%), mutual fund distribution commissions (0.5% - 1% AUM), B2B alternative credit scoring API licensing, and Premium subscription tiers (advanced AI insights). Year 1 Projection: 10,000 active monthly users (MAU) spending 2,000,000 ₫/month via merchant channels yields 250,000,000 ₫/month at an average 1.25% fee rate.
  </p>
  
  <h3 style="font-size: 14pt; font-weight: bold; margin-top: 0.8cm;">3.3 Product Roadmap and Allocation of Funds</h3>
  <p style="text-align: justify; padding-left: 0.5cm; margin-bottom: 0.5cm;">
    <strong>- Months 1-3:</strong> Finalize UII Incubator MVP, onboard 500 college beta testers, sign MOUs with 2 open-ended fund partners.<br>
    <strong>- Months 3-6:</strong> Integrate live mutual fund APIs, launch Autopilot regular savings feature with smart alerts.<br>
    <strong>- Months 6-12:</strong> Pilot B2B risk-scoring API licensing with 1 commercial bank. Target 5,000 MAU.<br>
    <strong>- Months 12+:</strong> Raise seed funding, scale platform infrastructure, apply for SBV fintech sandbox.
  </p>
  <p style="text-align: justify; text-indent: 1.2cm;">
    Use of Funds: 40% on Engineering and AI R&D, 25% on User Acquisition (referral networks), 20% on Legal & SBV Sandbox compliance, and 15% on Cloud Operations.
  </p>
</div>
