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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// モデルとリトライの設定
const ATTEMPTS = [
  { model: "gemini-2.5-flash", waitBefore: 0 },
  { model: "gemini-2.5-flash", waitBefore: 8000 },
  { model: "gemini-2.0-flash", waitBefore: 5000 },
  { model: "gemini-2.0-flash", waitBefore: 8000 },
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

    // 順番に試行。待機 → リクエスト → 成功ならreturn、失敗なら次へ
    for (let i = 0; i < ATTEMPTS.length; i++) {
      const { model, waitBefore } = ATTEMPTS[i];

      if (waitBefore > 0) {
        await sleep(waitBefore);
      }

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts
            ?.map((p: any) => p.text)
            .filter(Boolean)
            .join("") || "";

          if (text) {
            const groundingChunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            return res.status(200).json({ text, groundingChunks });
          }
        }

        console.error(`Attempt ${i + 1}/${ATTEMPTS.length} (${model}): ${response.status}`);
      } catch (e) {
        console.error(`Attempt ${i + 1}/${ATTEMPTS.length} (${model}): network error`);
      }
    }

    // 全て失敗
    return res.status(502).json({ error: "AIサービスが一時的に混み合っています。1分ほどお待ちいただき再度お試しください。" });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
