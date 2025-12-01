import { GoogleGenerativeAI } from '@google/generative-ai';
import { ModAnalysisResult } from '../types';

// Use Vite's import.meta.env for client-side env (requires VITE_ prefix in .env files)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export async function analyzeMods(modIds: string): Promise<ModAnalysisResult | null> {
  if (!API_KEY) {
    console.error('VITE_GEMINI_API_KEY environment variable not set.');
    return {
      modAnalyses: [],
      overallSummary: 'API Key not configured. Please set VITE_GEMINI_API_KEY.',
      potentialConflicts: ['Cannot perform analysis without an API key.'],
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an expert on Ark: Survival Ascended dedicated servers and mods.
Analyze the following list of comma-separated Ark: Survival Ascended Steam Workshop mod IDs: ${modIds}.
For each mod ID, provide its name and a brief, one-sentence summary.
Then, provide a short overall summary of the mod list and list any potential compatibility issues or conflicts between them. If there are no obvious conflicts, state that.
Return the response as a single, valid JSON object with the shape:
{
  "modAnalyses": [{ "id": string, "name": string, "summary": string }],
  "overallSummary": string,
  "potentialConflicts": string[]
}
Only return JSON.
`.trim();

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Try to parse JSON; if the model surrounded it with markdown, strip it
    const jsonText = text
      .replace(/^\s*```(?:json)?/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    return JSON.parse(jsonText) as ModAnalysisResult;
  } catch (error) {
    console.error('Error analyzing mods with Gemini API:', error);
    return null;
  }
}