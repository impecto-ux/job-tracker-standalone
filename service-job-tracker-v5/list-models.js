
const https = require('https');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("No API Key found in .env");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", json.error);
            } else if (json.models) {
                console.log("--- AVAILABLE MODELS ---");
                json.models.forEach(m => {
                    if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                        console.log(`Name: ${m.name} | Display: ${m.displayName}`);
                    }
                });
            } else {
                console.log("No models field in response:", json);
            }
        } catch (e) {
            console.error("Failed to parse response:", e);
            console.log("Raw:", data);
        }
    });
}).on('error', (e) => {
    console.error("Request error:", e);
});
