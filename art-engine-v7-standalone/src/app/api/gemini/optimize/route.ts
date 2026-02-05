import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();
        console.log("Received Prompt:", prompt);

        const apiKey = process.env.GEMINI_API_KEY;
        console.log("API Key Present:", !!apiKey);

        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const systemInstruction = `You are a prompt engineer for an AI image generator (Flux.1 / Stable Diffusion). 
        Your goal is to optimize the user's simple prompt into a detailed, descriptive, and artistic prompt.
        
        Rules:
        1. Keep the main subject clear.
        2. Add details about lighting (setup, golden hour, cinematic, etc.).
        3. Add details about style (photorealistic, oil painting, cyberpunk, etc.).
        4. Add details about composition (wide angle, macro, depth of field).
        5. Output ONLY the enhanced prompt. Do not add explanations.`;

        const result = await model.generateContent(`${systemInstruction}\n\nUser Prompt: ${prompt}`);
        const enhancedPrompt = result.response.text();

        return NextResponse.json({ enhancedPrompt });

    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json({ error: `Failed to optimize prompt: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
    }
}
