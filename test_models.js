const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // Intentamos listar los modelos disponibles para tu clave
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    console.log("--- MODELOS DISPONIBLES PARA TU CLAVE ---");
    if (data.models) {
      data.models.forEach(m => console.log("- " + m.name));
    } else {
      console.log("No se devolvieron modelos. Respuesta completa:", data);
    }
  } catch (e) {
    console.error("Error al conectar:", e);
  }
}

listModels();