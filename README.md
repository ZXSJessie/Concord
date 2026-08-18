# Concord

Concord 是一個長者照護語音記錄、模塊化分析、報告生成與 WhatsApp 彙報 Demo。

## 當前 Demo 流程

1. 首頁顯示護工當天任務和未完成事項。
2. 點擊任務進入活動選擇頁。
3. 選擇照護模塊。長者必選模塊會強制選中，非必選模塊可手動勾選或取消。
4. 進入語音錄入頁，查看已選模塊提示。
5. 按住說話進行 ASR 錄入，識別文字會進入文本框，也可以手動修改。
6. 點擊下一步後調用 `/api/report/analyze`，用阿里百鍊按模塊分析文本。
7. 分析頁會把未識別模塊排在上方，已識別模塊顯示綠色。每張卡片可點開編輯，也可按住底部錄音按鈕對當前模塊補充語音。
8. 如果選擇了模塊 10，會進入耆力 / 防跌運動次數頁，手動填寫各項次數。
9. 點擊確認後調用 `/api/report/finalize`，用阿里百鍊生成最終詳細報告。
10. 報告詳情頁可修改老人資料、日期、體徵、模塊報告內容，並可下載 Google Form 結構的 Excel。
11. 進入 WhatsApp 報告頁，可編輯口述版報告、選擇圖片、打開 WhatsApp。
12. 在 WhatsApp 中選擇聯繫人併發送後，回到 app 點擊右側確認按鈕，進入完成頁並更新任務狀態。

## 技術方案

- 前端：Next.js 14 + React 18 + TypeScript
- 本地服務：`server.mjs`
- 實時 ASR：Speechmatics Realtime API
- 模塊分析：阿里百鍊國際站 DashScope OpenAI-compatible API，默認 `qwen-flash`
- 最終報告：阿里百鍊國際站 DashScope OpenAI-compatible API，默認 `qwen-plus`
- Demo 數據：本地假數據
- 會話暫存：瀏覽器 `localStorage`
- 導出：`xlsx`，下載 Google Form 結構 Excel
- WhatsApp：使用 `https://wa.me/?text=...` 打開 WhatsApp，由用戶自行選擇聯繫人

## 關鍵頁面

- `/`
  - 首頁任務看板
- `/report/[id]/modules`
  - 活動選擇頁
- `/report/[id]`
  - 語音錄入頁
- `/report/[id]/analysis`
  - 模塊分析與補充頁
- `/report/[id]/exercise`
  - 模塊 10 耆力 / 防跌運動次數頁
- `/report/[id]/result`
  - 報告詳情頁
- `/report/[id]/whatsapp`
  - WhatsApp 報告頁
- `/report/[id]/done`
  - 完成頁，更新任務狀態

## 關鍵接口

- `/api/speechmatics/token`
  - 生成 Speechmatics 實時 token
- `/api/report/analyze`
  - 第一次 LLM 調用，按已選模塊分析 ASR 文本
- `/api/report/finalize`
  - 第二次 LLM 調用，生成最終詳細報告
- `/api/report/export`
  - 導出 Google Form 結構 Excel
- `/api/report`
  - 舊版報告生成接口，仍保留兼容

## 本地啟動

### 0. 前置要求

本地需要安裝：

- Node.js 20 或更高版本
- npm
- Git

檢查命令：

```bash
node -v
npm -v
git --version
```

如果 `node` 或 `npm` 不存在，先安裝 Node.js。Windows 用戶安裝後如果命令仍不可用，關閉當前 PowerShell / Terminal，重新打開後再檢查。

### 1. 拉取代碼

第一次下載項目：

```bash
git clone https://github.com/AliceLong/Concord.git
cd Concord
```

已有項目時更新最新代碼：

```bash
git pull origin main
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 配置環境變量

複製模板：

```bash
cp .env.example .env.local
```

Windows PowerShell 可用：

```powershell
Copy-Item .env.example .env.local
```

然後打開 `.env.local`，至少填寫：

```env
AI_PROVIDER=dashscope
AI_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
AI_API_KEY=your_dashscope_api_key
AI_ANALYSIS_MODEL=qwen-flash
AI_REPORT_MODEL=qwen-plus
AI_ANALYSIS_TIMEOUT_MS=60000
AI_REPORT_TIMEOUT_MS=90000

SPEECHMATICS_API_KEY=your_speechmatics_api_key
SPEECHMATICS_RT_URL=wss://eu2.rt.speechmatics.com/v2
SPEECHMATICS_RT_LANGUAGE=yue
SPEECHMATICS_RT_MAX_DELAY=0.7
SPEECHMATICS_RT_TTL_SECONDS=60
```

說明：

- `AI_API_KEY` 是阿里百鍊國際站 API key，用於模塊分析和報告生成。
- `AI_ANALYSIS_MODEL=qwen-flash` 適合模塊分類，速度優先。
- `AI_REPORT_MODEL=qwen-plus` 適合最終報告，質量優先。
- Demo 階段建議把超時時間設成 `60000` 和 `90000`，減少現場網絡抖動導致的失敗。
- `SPEECHMATICS_API_KEY` 用於實時語音轉文字。

`.env.local` 只放在本機，不要提交到 GitHub。

### 4. 啟動開發環境

```bash
npm run dev
```

啟動成功後會看到類似：

```text
Ready on http://0.0.0.0:3000
```

瀏覽器打開：

```text
http://localhost:3000
```

如果 `3000` 被佔用，可以換端口：

```bash
PORT=3010 npm run dev
```

然後打開：

```text
http://localhost:3010
```

### 5. 本地驗證順序

建議按這個順序跑完整 demo：

1. 打開首頁，確認能看到“今日的任務”和“未完成事項”。
2. 點擊一個任務進入活動選擇頁。
3. 確認 10 個模塊全部顯示，必選模塊已選中。
4. 選擇需要演示的模塊，例如短期記憶、說話流暢度、聽覺 / 專注力訓練。
5. 進入語音錄入頁。
6. 可以直接在文本框粘貼測試文案，也可以按住說話錄音。
7. 點擊下一步，等待模塊分析。
8. 確認未識別模塊排在上方，已識別模塊顯示綠色。
9. 點擊模塊卡片，確認可以手動編輯或按住說話補充。
10. 如果選擇模塊 10，確認會出現運動次數填寫頁。
11. 點擊確認後進入報告詳情頁。
12. 修改老人資料、日期、模塊報告內容，確認可編輯。
13. 點擊上傳至 Google Form，確認下載 `.xlsx`。
14. 進入 WhatsApp 報告頁，點擊發送至 WhatsApp。
15. 在 WhatsApp 中選擇聯繫人併發送；回到 app 後點擊右側綠色確認按鈕。
16. 進入完成頁後返回首頁，確認對應任務從待辦中消失。

## 常用命令

```bash
npm run dev
npm run typecheck
npm run build
```

## 常見問題

### `npm` 或 `node` 不存在

說明 Node.js 沒裝好，或終端沒有刷新環境變量。安裝 Node.js 後關閉終端重新打開，再運行：

```bash
node -v
npm -v
```

### 阿里百鍊連接失敗：請求超時

說明請求超過了環境變量中的超時時間。常見原因是網絡波動、ASR 文本太長、一次選擇模塊過多，或模型服務排隊。

Demo 建議：

```env
AI_ANALYSIS_TIMEOUT_MS=60000
AI_REPORT_TIMEOUT_MS=90000
```

如果仍然偶發失敗，重新點擊分析或確認即可重試。

### WhatsApp 打開空白頁

項目使用的是 `https://wa.me/?text=...`。如果電腦沒有登錄 WhatsApp Web，或瀏覽器沒有正確接管鏈接，可能會看到空白頁。

Demo 時建議：

- 電腦提前登錄 WhatsApp Web。
- 或在手機瀏覽器打開同一頁面測試。
- 打開 WhatsApp 後由用戶自行選擇聯繫人併發送。

### 圖片不能自動帶入 WhatsApp

瀏覽器 deeplink 不能把本地圖片自動塞進 WhatsApp 輸入框。當前 demo 支持在頁面選擇圖片並顯示文件名，發送 WhatsApp 時需要用戶在 WhatsApp 中手動附加圖片。

## 當前限制

- 仍然是 Demo 版本，沒有接真實數據庫。
- 長者、任務、必選模塊來自本地假數據。
- 報告和模塊分析依賴阿里百鍊網絡穩定性。
- WhatsApp 不做後臺自動發送，只打開 WhatsApp 並讓用戶自行選擇聯繫人。
- Google Form 目前是下載 Excel 文件，不是直接寫入在線 Google Form。
