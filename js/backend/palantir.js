const { GoogleGenerativeAI } = require("@google/generative-ai");

// Asumimos que las credenciales están en el entorno
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: { responseMimeType: "application/json" }
});

function extraerJSON(texto) {
    try {
        const inicio = texto.indexOf('{');
        const fin = texto.lastIndexOf('}') + 1;
        if (inicio !== -1 && fin !== -1) return texto.substring(inicio, fin);
        return null; // Devolvemos null si no encontramos un JSON válido
    } catch (e) { return null; }
}

/**
 * Consulta al Oráculo (Gemini API) para obtener una predicción estratégica.
 * @param {Array<Object>} historicalData - El snapshot de los últimos 7 días.
 * @returns {Promise<Object>} - La predicción en formato JSON.
 */
async function getPalantirPrediction(historicalData) {
    const historicalJSON = JSON.stringify(historicalData, null, 2);

    const systemPrompt = `
    ROL: Eres el "Estratega del Palantír" para el sistema S.A.M.
    OBJETIVO: Analizar el historial de 7 días de un usuario y predecir su rendimiento para el día siguiente. Tu tono es el de un consejero sabio y antiguo, como Gandalf o Elrond, pero con la precisión de un estratega militar.

    DATOS DE ENTRADA (JSON):
    Recibirás un array de 7 objetos. Cada objeto representa un día.
    - date: La fecha.
    - totalTasks: Nº total de gestas.
    - successRate: % de éxito global de ese día.
    - shadowLevel: Nivel de procrastinación ('neutral', 'low', 'medium', 'high').
    - successByCategory: Objeto con el % de éxito para cada categoría (ej: {"trabajo": 50, "hogar": 100}).

    ANÁLISIS ESTRATÉGICO:
    Tu tarea es identificar patrones sutiles. No te limites a promedios. Busca correlaciones:
    1.  FATIGA ACUMULADA: ¿Un alto nº de tareas (totalTasks > 6) precede a un día de bajo rendimiento (successRate < 50%)?
    2.  DESBALANCE CATEGÓRICO: ¿El fracaso en una categoría (ej: "estudio") coincide con una alta carga en otra (ej: "trabajo")?
    3.  PATRONES DE SOMBRA: ¿Un shadowLevel 'medium' o 'high' se repite cada ciertos días? ¿Es un ciclo?
    4.  TENDENCIAS: ¿La successRate está bajando progresivamente a lo largo de la semana?

    FORMATO DE SALIDA (JSON ÚNICO - SIN EXCEPCIONES):
    Debes devolver SOLAMENTE un objeto JSON con la siguiente estructura:
    {
      "probabilidad_fallo": <number>,  // Un % estimado (0-100) de que el usuario falle una misión importante mañana.
      "alerta": "<string>",           // Mensaje de alerta MUY CORTO y directo. (Máx 10 palabras).
      "sugerencia": "<string>"        // Una acción táctica, clara y accionable. (Máx 20 palabras).
    }

    EJEMPLO DE ANÁLISIS Y SALIDA:
    - INPUT: El usuario tuvo 8 tareas de "trabajo" el lunes, y el martes su éxito en "estudio" fue 0%.
    - TU LÓGICA: Detectas sobrecarga.
    - OUTPUT JSON:
      {
        "probabilidad_fallo": 75,
        "alerta": "Riesgo de sobrecarga detectado en el flanco del 'Trabajo'.",
        "sugerencia": "Prioriza una gesta de 'Ocio' o 'Salud' para reequilibrar la moral de la tropa."
      }
    `;

    try {
        const result = await model.generateContent([systemPrompt, "Analiza estos datos:", historicalJSON]);
        const jsonText = extraerJSON(result.response.text());
        
        if (!jsonText) {
            throw new Error("La respuesta del Oráculo no contenía un JSON válido.");
        }

        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error al contactar con el Oráculo:", error.message);
        // En caso de error de API, devolvemos una predicción neutral y segura.
        return {
            probabilidad_fallo: 0,
            alerta: "El Palantír está velado por la sombra.",
            sugerencia: "Procede con cautela, los presagios no son claros hoy."
        };
    }
}

module.exports = { getPalantirPrediction };
