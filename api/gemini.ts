import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // POSTのみ許可
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // サーバー側の環境変数からAPIキーを取得（ブラウザには露出しない）
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const { prompt, systemInstruction, temperature } = req.body;

    // 入力チェック
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required" });
    }

    // プロンプトの長さ制限（プロンプトインジェクション軽減）
    if (prompt.length > 5000) {
      return res.status(400).json({ error: "prompt too long" });
    }

    // Gemini API を直接 REST で呼ぶ
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const body: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: typeof temperature === "number" ? temperature : 0.2,
      },
      tools: [{ googleSearch: {} }],
    };

    if (systemInstruction && typeof systemInstruction === "string") {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
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

    // レスポンスからテキストとソース情報を抽出
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

