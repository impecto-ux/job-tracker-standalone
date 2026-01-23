
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Dummy init to get client? No, need direct access if possible or just try catch commonly used ones.

        // Actually, looking at docs, genAI instance doesn't have listModels directly exposed in some versions, 
        // but let's try assuming the user might have a specific version.
        // If not, we will try to just infer from error or try 'gemini-1.0-pro'.

        // Official way in newer SDKs might be different, but let's try to just Instantiate a model and if it fails print error.
        console.log("Checking models...");

        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];

        for (const m of modelsToTry) {
            console.log(`--- Testing ${m} ---`);
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("Hello");
                console.log(`[PASS] ${m} is available!`);
                break;
            } catch (e) {
                console.log(`[FAIL] ${m}: ${e.message.split(']')[1] || e.message}`);
            }
        }


    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
