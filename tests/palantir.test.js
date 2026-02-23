/**
 * @jest-environment node
 */
const { getPalantirPrediction } = require('../js/backend/palantir');

// Mock parcial: Interceptamos solo el mÃ³dulo de la IA
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            // Forzamos que la generaciÃ³n de contenido lance un error
            generateContent: jest.fn().mockRejectedValue(new Error("API quota exceeded")),
        }),
    })),
}));

describe('Palantir - OrÃ¡culo Predictivo', () => {

    test('Debe manejar un error de la API de Gemini y devolver un objeto de fallback seguro', async () => {
        const mockHistoricalData = [{ date: '2025-01-01', totalTasks: 5, successRate: 80 }];
        
        // Ejecutamos la funciÃ³n esperando que falle internamente pero se recupere
        const prediction = await getPalantirPrediction(mockHistoricalData);

        // Verificamos que obtenemos la estructura de fallback predefinida
        expect(prediction).toBeDefined();
        expect(prediction.probabilidad_fallo).toBe(0);
        expect(prediction.alerta).toBe("El PalantÃ­r estÃ¡ velado por la sombra.");
        expect(prediction.sugerencia).toBe("Procede con cautela, los presagios no son claros hoy.");
    });
});

