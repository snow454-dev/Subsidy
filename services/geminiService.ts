import { SYSTEM_INSTRUCTION } from "../constants";
import { GeminiResponse, GroundingChunk } from "../types";

const callGeminiAPI = async (
  prompt: string,
  temperature: number = 0.2
): Promise<GeminiResponse> => {
  try {
    const controller = new AbortController();
    // サーバー側でリトライするため90秒まで待つ
    const timeout = setTimeout(() => controller.abort(), 90000);

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
      return { text: err.error || "AIサービスが一時的に混み合っています。1分ほどお待ちいただき再度お試しください。" };
    }

    const data = await response.json();
    return {
      text: data.text || "情報の取得に失敗しました。",
      groundingChunks: data.groundingChunks as GroundingChunk[] | undefined,
    };
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return { text: "応答に時間がかかっています。再度お試しください。" };
    }
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
