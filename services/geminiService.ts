import { SYSTEM_INSTRUCTION } from "../constants";
import { GeminiResponse, GroundingChunk } from "../types";

// サーバー側API経由でGeminiを呼ぶ共通関数
const callGeminiAPI = async (
  prompt: string,
  temperature: number = 0.2
): Promise<GeminiResponse> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60秒タイムアウト

    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("API error:", err);
      return { text: "エラーが発生しました。しばらくしてから再試行してください。" };
    }

    const data = await response.json();
    return {
      text: data.text || "情報の取得に失敗しました。",
      groundingChunks: data.groundingChunks as GroundingChunk[] | undefined,
    };
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return { text: "応答に時間がかかりすぎました。もう一度お試しください。" };
    }
    console.error("Fetch error:", error);
    return { text: "通信エラーが発生しました。インターネット接続を確認してください。" };
  }
};

export const fetchSubsidies = async (prompt: string): Promise<GeminiResponse> => {
  return callGeminiAPI(prompt, 0.2);
};

export const fetchSubsidyDetails = async (prompt: string): Promise<GeminiResponse> => {
  return callGeminiAPI(prompt, 0.2);
};

export const generateDraft = async (prompt: string): Promise<GeminiResponse> => {
  return callGeminiAPI(prompt, 0.4);
};

export const generateChecklist = async (prompt: string): Promise<GeminiResponse> => {
  return callGeminiAPI(prompt, 0.2);
};
