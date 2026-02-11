/**
 * @jest-environment node
 */
const { getPalantirPrediction } = require('../palantir');

// Mock parcial: Interceptamos solo el módulo de la IA
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            // Forzamos que la generación de contenido lance un error
            generateContent: jest.fn().mockRejectedValue(new Error("API quota exceeded")),
        }),
    })),
}));

describe('Palantir - Oráculo Predictivo', () => {

    test('Debe manejar un error de la API de Gemini y devolver un objeto de fallback seguro', async () => {
        const mockHistoricalData = [{ date: '2025-01-01', totalTasks: 5, successRate: 80 }];
        
        // Ejecutamos la función esperando que falle internamente pero se recupere
        const prediction = await getPalantirPrediction(mockHistoricalData);

        // Verificamos que obtenemos la estructura de fallback predefinida
        expect(prediction).toBeDefined();
        expect(prediction.probabilidad_fallo).toBe(0);
        expect(prediction.alerta).toBe("El Palantír está velado por la sombra.");
        expect(prediction.sugerencia).toBe("Procede con cautela, los presagios no son claros hoy.");
    });
});
