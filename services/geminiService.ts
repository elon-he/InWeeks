
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Fix: Using process.env.API_KEY directly as a named parameter as per SDK guidelines
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeSentiment(content: string) {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze the sentiment of this journal entry and return a single word representing the mood (Amazing, Happy, Neutral, Sad, or Angry): "${content}"`,
      });
      return response.text?.trim() || "Neutral";
    } catch (error) {
      console.error("Gemini analysis failed", error);
      return "Neutral";
    }
  }

  async getSummary(content: string) {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Summarize this week's journal entry in one short, catchy sentence: "${content}"`,
      });
      return response.text?.trim() || "";
    } catch (error) {
      console.error("Gemini summary failed", error);
      return "";
    }
  }
}

export const gemini = new GeminiService();
