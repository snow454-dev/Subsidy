import type { VercelRequest, VercelResponse } from "@vercel/node";

// ナレッジのメモリキャッシュ（5分間有効）
let knowledgeCache: { text: string; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5分

// GASからPDFナレッジを取得（キャッシュ付き）
async function fetchKnowledge(): Promise<string> {
  // キャッシュが有効ならそれを返す
  if (knowledgeCache && Date.now() - knowledgeCache.timestamp < CACHE_TTL) {
    return knowledgeCache.text;
  }

  const gasUrl = process.env.GAS_URL;
  if (!gasUrl) return "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5秒でタイムアウト

    const res = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "getKnowledge" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await res.json();
    const knowledge = data.knowledge || "";

    // キャッシュに保存
    knowledgeCache = { text: knowledge, timestamp: Date.now() };

    return knowledge;
  } catch {
    // タイムアウトやエラー時はキャッシュがあればそれを返す、なければ空
    return knowledgeCache?.text || "";
  }
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

    // ナレッジ取得を先行開始（Geminiリクエスト組み立てと並列）
    const knowledgePromise = fetchKnowledge();

    // ナレッジ取得完了を待つ
    const knowledge = await knowledgePromise;

    // システムインストラクションを組み立て
    let fullSystemInstruction = systemInstruction || "";
    if (knowledge) {
      fullSystemInstruction += `\n\n=== 補助金ナレッジ（管理者登録済み資料） ===\n${knowledge}\n=== ナレッジここまで ===`;
    }

    // Gemini API を呼ぶ
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

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      return res.status(502).json({ error: "Gemini API request failed" });
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
