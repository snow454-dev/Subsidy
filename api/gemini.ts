import type { VercelRequest, VercelResponse } from "@vercel/node";

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

// 使用するモデルの優先順位
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

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

    // モデルを順番に試す
    for (const model of MODELS) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        const text =
          data.candidates?.[0]?.content?.parts
            ?.map((p: any) => p.text)
            .filter(Boolean)
            .join("") || "";

        if (text) {
          const groundingChunks =
            data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          return res.status(200).json({ text, groundingChunks });
        }
      }

      // 503等のサーバーエラーなら次のモデルへ
      console.error(`Model ${model} failed: ${response.status}`);
    }

    return res.status(502).json({ error: "All models failed" });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
