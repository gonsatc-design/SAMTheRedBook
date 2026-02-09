require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function check() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // Intentamos listar los modelos
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        
        console.log("--- TUS MODELOS DISPONIBLES ---");
        if (data.models) {
            data.models.forEach(m => console.log("✅ " + m.name));
        } else {
            console.log("❌ No se listaron modelos. Respuesta de Google:", data);
        }
    } catch (e) {
        console.log("❌ Error de red:", e.message);
    }
}
check();