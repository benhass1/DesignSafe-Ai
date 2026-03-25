import { GoogleGenAI, Type } from "@google/genai";

// Lazy initialization to avoid crashing if API key is missing
let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please add it to your secrets.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export interface DesignAnalysis {
  style: string;
  layout: string;
  color_palette: string[];
  elements: string[];
  brand_indicators: { name: string; status: "LIVE" | "DEAD" | "UNKNOWN" }[];
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  risk_explanation: string;
}

export async function analyzeDesign(imageBase64: string): Promise<DesignAnalysis> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: imageBase64.split(",")[1] || imageBase64,
            },
          },
          {
            text: `Analyze this graphic/T-shirt design for copyright and trademark risks. 
            1. Extract the style, composition, color palette, elements, and any brand indicators or phrases.
            2. For any detected text, phrases, or brand names, check their trademark status on USPTO.gov (https://www.uspto.gov/). 
            3. Specifically identify if any trademarks are LIVE or DEAD.
            4. Assign a risk level (LOW, MEDIUM, HIGH) based on the USPTO status and visual similarity to existing IP.
            5. Provide a detailed explanation of the risk.
            Return the result in JSON format.`,
          },
        ],
      },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          style: { type: Type.STRING },
          composition: { type: Type.STRING },
          color_palette: { type: Type.ARRAY, items: { type: Type.STRING } },
          elements: { type: Type.ARRAY, items: { type: Type.STRING } },
          brand_indicators: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                status: { type: Type.STRING, enum: ["LIVE", "DEAD", "UNKNOWN"] }
              },
              required: ["name", "status"]
            } 
          },
          risk_level: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
          risk_explanation: { type: Type.STRING },
        },
        required: ["style", "composition", "color_palette", "elements", "brand_indicators", "risk_level", "risk_explanation"],
      },
    },
  });

  const result = JSON.parse(response.text || "{}");
  return {
    ...result,
    layout: result.composition // Map back to the interface property
  };
}

export function getSafeDesignPrompt(analysis: DesignAnalysis, creativity: number = 0.5): string {
  const basePrompt = `Create a professional, high-quality T-shirt graphic design that is a complete visual transformation of the original idea, but MUST keep the exact same phrases and core elements.

Design Specifications:
- Subject: ${analysis.elements.join(", ")} (Maintain exact breeds, species, and objects)
- Phrases/Text: Keep any text or phrases from the original exactly as they are.
- Style: ${analysis.style} (Use this as a base but introduce a fresh artistic interpretation)
- Composition: ${analysis.layout}
- Color Palette: ${analysis.color_palette.join(", ")}

CREATIVE TRANSFORMATION REQUIREMENTS:
- The visual style must be DIFFERENT from the original to ensure legal originality.
- Change the artistic execution, line work, shading, and overall aesthetic.
- DO NOT add any NEW text, words, or typography. Only use what was in the original.
- Use the creativity level (${creativity}) to introduce a unique, original visual identity.
- Ensure the final design is a unique work of art that captures the "essence" of the original but is visually distinct.
- BACKGROUND: TRANSPARENT BACKGROUND

Output: 1 high-quality, professional T-shirt design, clean, modern, original, transparent background, vector style, apparel ready`;

  return basePrompt;
}

export async function generateSafeDesign(analysis: DesignAnalysis, creativity: number = 0.5): Promise<string> {
  const ai = getAI();
  const prompt = getSafeDesignPrompt(analysis, creativity);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        { text: prompt },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
}
