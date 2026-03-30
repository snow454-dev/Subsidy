import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { GeminiResponse, GroundingChunk } from "../types";

const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY || "";

export const fetchSubsidies = async (prompt: string): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    });

    const text = response.text || "情報の取得に失敗しました。";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;

    return { text, groundingChunks };
  } catch (error) {
    console.error("Fetch error:", error);
    return { text: "エラーが発生しました。インターネット接続や所在地設定を確認してください。" };
  }
};

export const fetchSubsidyDetails = async (prompt: string): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    });
    return { text: response.text || "詳細情報の取得に失敗しました。" };
  } catch (error) {
    return { text: "通信エラーが発生しました。" };
  }
};

export const generateDraft = async (prompt: string): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });
    return { text: response.text || "ドラフトの生成に失敗しました。" };
  } catch (error) {
    return { text: "通信エラーが発生しました。" };
  }
};

export const generateChecklist = async (prompt: string): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    });
    return { text: response.text || "チェックリストの生成に失敗しました。" };
  } catch (error) {
    return { text: "通信エラーが発生しました。" };
  }
};
