import type { VercelRequest, VercelResponse } from "@vercel/node";

// GASからPDFナレッジを取得
async function fetchKnowledge(): Promise<string> {
  const gasUrl = process.env.GAS_URL;
  if (!gasUrl) return "";

  try {
    const res = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "getKnowledge" }),
    });
    const data = await res.json();
    return data.knowledge || "";
  } catch {
    console.error("Failed to fetch knowledge from GAS");
    return "";
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // POSTのみ許可
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // サーバー側の環境変数からAPIキーを取得
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

    // GASからPDFナレッジを取得
    const knowledge = await fetchKnowledge();

    // ナレッジがあればシステムインストラクションに追加
    let fullSystemInstruction = systemInstruction || "";
    if (knowledge) {
      fullSystemInstruction += `\n\n===== 管理者がアップロードした最新の補助金ナレッジ =====\n以下は管理者が登録した最新の補助金関連資料です。回答の際はこの情報を優先的に参考にしてください。ただし公募が終了している可能性もあるため、Google検索の結果と照合して最新情報を提供してください。\n\n${knowledge}\n===== ナレッジここまで =====`;
    }

    // Gemini API を呼ぶ
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const body: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: typeof temperature === "number" ? temperature : 0.2,
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
