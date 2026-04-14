import type { VercelRequest, VercelResponse } from "@vercel/node";

// ナレッジのメモリキャッシュ（5分間有効）
let knowledgeCache: { text: string; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchKnowledge(): Promise<string> {
  if (knowledgeCache && Date.now() - knowledgeCache.timestamp < CACHE_TTL) {
    return knowledgeCache.text;
  }

  const gasUrl = process.env.GAS_URL;
  if (!gasUrl) return "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "getKnowledge" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    const knowledge = data.knowledge || "";
    knowledgeCache = { text: knowledge, timestamp: Date.now() };
    return knowledge;
  } catch {
    return knowledgeCache?.text || "";
  }
}

// Gemini APIをリトライ付きで呼び出す
async function callGeminiWithRetry(url: string, body: any, maxRetries: number = 3): Promise<Response> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // 成功 or クライアントエラー（4xx）はそのまま返す
    if (response.ok || (response.status >= 400 && response.status < 500)) {
      return response;
    }

    // 503等のサーバーエラーはリトライ
    lastError = response;
    console.error(`Gemini API error (attempt ${i + 1}/${maxRetries}): ${response.status}`);

    // リトライ前に少し待つ（1秒、2秒、4秒）
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  return lastError;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const { prompt, systemInstruction, temperature } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required" });
    }

    if (prompt.length > 5000) {
      return res.status(400).json({ error: "prompt too long" });
    }

    const knowledge = await fetchKnowledge();

    let fullSystemInstruction = systemInstruction || "";
    if (knowledge) {
      fullSystemInstruction += `\n\n=== 補助金ナレッジ（管理者登録済み資料） ===\n${knowledge}\n=== ナレッジここまで ===`;
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const body: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: typeof temperature === "number" ? temperature : 0.2,
        maxOutputTokens: 4096,
      },
      tools: [{ googleSearch: {} }],
    };

    if (fullSystemInstruction) {
      body.systemInstruction = { parts: [{ text: fullSystemInstruction }] };
    }

    // リトライ付きで呼び出し
    const response = await callGeminiWithRetry(geminiUrl, body, 3);

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      return res.status(502).json({ error: "Gemini API request failed", status: response.status });
    }

    const data = await response.json();

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text)
        .filter(Boolean)
        .join("") || "情報の取得に失敗しました。";

    const groundingChunks =
      data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return res.status(200).json({ text, groundingChunks });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
