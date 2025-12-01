import { GoogleGenAI, Type } from "@google/genai";
import { ModAnalysisResult } from '../types';

export async function analyzeMods(modIds: string): Promise<ModAnalysisResult | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are an expert on Ark: Survival Ascended dedicated servers and mods.
    Analyze the following list of comma-separated Ark: Survival Ascended Steam Workshop mod IDs: ${modIds}.

    For each mod ID, provide its name and a brief, one-sentence summary.
    It is CRITICAL that you return the analyses in the exact same order as the mod IDs provided in the input.

    Then, provide a short overall summary of the mod list and list any potential compatibility issues or conflicts between them. If there are no obvious conflicts, state that.

    Return the response as a single, valid JSON object. Do not include any text, markdown, or backticks outside of the JSON object itself.
    `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    modAnalyses: {
                        type: Type.ARRAY,
                        description: "List of analyses for each mod, in the same order as the input IDs.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "The name of the mod." },
                                summary: { type: Type.STRING, description: "A brief summary of the mod." },
                            }
                        }
                    },
                    overallSummary: { 
                        type: Type.STRING,
                        description: "A high-level summary of the selected mods."
                    },
                    potentialConflicts: {
                        type: Type.ARRAY,
                        description: "A list of potential conflicts, described in strings.",
                        items: {
                            type: Type.STRING
                        }
                    }
                }
            }
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as ModAnalysisResult;

  } catch (error) {
    console.error("Error analyzing mods with Gemini API:", error);
    return null;
  }
}
