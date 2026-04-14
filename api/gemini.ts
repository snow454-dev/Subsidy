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

// 1つのモデルに対して最大2回試行（429の場合は待機してリトライ）
async function tryModel(model: string, apiKey: string, body: any): Promise<{ ok: boolean; data?: any; status?: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  for (let attempt = 0; attempt < 2; attempt++) {
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
        return { ok: true, data: { text, groundingChunks: data.candidates?.[0]?.groundingMetadata?.groundingChunks || [] } };
      }
    }

    const status = response.status;
    console.error(`Model ${model} attempt ${attempt + 1}: ${status}`);

    // 429（レート制限）なら5秒待ってリトライ
    if (status === 429 && attempt === 0) {
      await sleep(5000);
      continue;
    }

    // 503（サービス不可）ならこのモデルは諦める
    if (status === 503) {
      return { ok: false, status };
    }

    // その他のエラー
    return { ok: false, status };
  }

  return { ok: false, status: 429 };
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

    // gemini-2.5-flash を試行
    const result1 = await tryModel("gemini-2.5-flash", apiKey, body);
    if (result1.ok) {
      return res.status(200).json(result1.data);
    }

    // 失敗したら3秒待ってから gemini-2.0-flash を試行
    await sleep(3000);
    const result2 = await tryModel("gemini-2.0-flash", apiKey, body);
    if (result2.ok) {
      return res.status(200).json(result2.data);
    }

    return res.status(502).json({ error: "AI service is temporarily unavailable. Please try again in a minute." });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
