你的項目是一個 **Next.js 全棧項目**：前端和後端在同一個代碼倉庫裡，不是傳統的“前端一個項目、後端一個項目”分離結構。

整體可以這樣看：

```txt
Concord
├─ server.mjs                         # 自定義 Node/Next 啟動入口
├─ src/
│  ├─ app/                            # Next.js App Router：頁面 + API
│  │  ├─ page.tsx                     # 首頁：選擇長者
│  │  ├─ report/[id]/page.tsx         # 報告頁面：某個長者的錄音/報告頁
│  │  ├─ api/                         # 後端 HTTP API
│  │  │  ├─ report/route.ts           # 生成護理報告 API
│  │  │  ├─ speechmatics/token/route.ts # 獲取 Speechmatics 實時轉寫 token
│  │  └─ *.css                        # 頁面樣式
│  ├─ components/                     # 前端組件
│  │  └─ report-session.tsx           # 錄音、實時轉寫、生成報告的主要交互組件
│  ├─ lib/                            # 通用邏輯/第三方服務封裝
│  │  ├─ speechmatics.ts              # Speechmatics token/config 封裝
│  │  ├─ llm-client.ts                # OpenAI-compatible LLM 客戶端封裝
│  │  ├─ report-builder.ts            # 本地規則報告生成
│  │  └─ demo-data.ts                 # 示例長者數據
│  ├─ server/                         # 後端業務層
│  │  ├─ services/                    # 服務邏輯
│  │  └─ repositories/                # 數據讀取邏輯
│  └─ types/                          # TypeScript 類型定義
└─ public/
   └─ audio-worklet-recorder.js       # 瀏覽器錄音 AudioWorklet
```

**前端結構**

前端主要在這幾塊：

- [src/app/page.tsx](/Users/alicelong/Desktop/Concord/src/app/page.tsx)  
  首頁，顯示長者列表。點擊某個長者後進入 `/report/[id]`。

- [src/app/report/[id]/page.tsx](/Users/alicelong/Desktop/Concord/src/app/report/[id]/page.tsx)  
  某個長者的報告頁面。它先根據 URL 裡的 `id` 找長者資料，然後渲染 `ReportSession`。

- [src/components/report-session.tsx](/Users/alicelong/Desktop/Concord/src/components/report-session.tsx)  
  這是核心前端交互組件，負責：
  - 調用瀏覽器麥克風
  - 使用 `AudioWorklet` 處理音頻
  - 連接 Speechmatics 實時轉寫
  - 把轉寫文字顯示在 textarea
  - 調 `/api/report` 生成結構化報告
  - 展示生成後的 JSON 和報告文本

- CSS module 文件  
  比如 `page.module.css`、`report-session.module.css`，負責頁面和組件樣式。

這裡有一個重點：  
`page.tsx` 和 `report/[id]/page.tsx` 默認是 **Server Component**，而 `report-session.tsx` 頂部有 `"use client"`，所以它是 **Client Component**，瀏覽器錄音、狀態更新、按鈕點擊都在這裡做。

**後端結構**

後端主要分成四層：

1. 啟動層

[server.mjs](/Users/alicelong/Desktop/Concord/server.mjs)

它負責啟動整個 Next.js 應用。

2. API 路由層

這些是瀏覽器可以通過 `fetch()` 調用的接口：

- [src/app/api/report/route.ts](/Users/alicelong/Desktop/Concord/src/app/api/report/route.ts)  
  接收轉寫文本，生成護理報告。

- `src/app/api/speechmatics/token/route.ts`  
  給前端實時轉寫生成 Speechmatics token。當前 `ReportSession` 主要用的是這個接口。

3. 業務服務層

- [src/server/services/report.ts](/Users/alicelong/Desktop/Concord/src/server/services/report.ts)  
  根據長者 ID 和轉寫文本生成報告。

- [src/server/repositories/elder.ts](/Users/alicelong/Desktop/Concord/src/server/repositories/elder.ts)  
  讀取長者資料。目前是從 demo data 裡讀，不是真數據庫。

4. 第三方服務封裝層

- `src/lib/speechmatics.ts`  
  生成 Speechmatics 實時轉寫 token。

- [src/lib/llm-client.ts](/Users/alicelong/Desktop/Concord/src/lib/llm-client.ts)  
  調 OpenAI-compatible LLM（默認阿里百鍊，可換其他兼容服務），根據轉寫文本生成結構化護理報告。

- [src/lib/report-builder.ts](/Users/alicelong/Desktop/Concord/src/lib/report-builder.ts)  
  如果 LLM 配置不存在，就用本地規則生成一個報告。

**當前主要數據流**

現在核心流程大概是：

```txt
用戶打開首頁
  ↓
src/app/page.tsx 讀取 demo 長者列表
  ↓
點擊長者
  ↓
src/app/report/[id]/page.tsx 讀取長者資料
  ↓
ReportSession 在瀏覽器啟動錄音
  ↓
前端調用 /api/speechmatics/token
  ↓
前端直接連接 Speechmatics 實時轉寫
  ↓
轉寫文本進入 textarea
  ↓
點擊“生成報告”
  ↓
前端 POST /api/report
  ↓
src/server/services/report.ts
  ↓
src/lib/llm-client.ts 調 LLM 或 fallback 到 report-builder
  ↓
返回結構化報告給前端展示
```

所以一句話總結：

你的項目前端在 `src/app` 和 `src/components`，後端在 `server.mjs`、`src/app/api`、`src/server` 和部分 `src/lib` 裡。它是一個 Next.js 全棧應用，前後端沒有拆成兩個獨立項目。