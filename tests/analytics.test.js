/**
 * @jest-environment node
 */
const { getHistoricalSnapshot } = require('../js/backend/analytics');

// Mock completo del cliente Supabase para aislar el test de la DB real
const mockSelect = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: mockSelect,
    }),
  }),
}));

// --- Datos de Prueba ---
// Simulamos una respuesta de la DB con datos para 2 de los Ãºltimos 7 dÃ­as
const today = new Date();
const yesterday = new Date();
yesterday.setDate(today.getDate() - 1);

const mockDbResponse = [
    {
        log_date: today.toISOString(),
        user_id: 'test-user',
        tasks_total: 5,
        tasks_completed: 4,
        tasks_failed: 1,
        shadow_level: 'low',
        completed_by_category: { trabajo: 2, hogar: 2 },
        total_by_category: { trabajo: 3, hogar: 2 }
    },
    {
        log_date: yesterday.toISOString(),
        user_id: 'test-user',
        tasks_total: 2,
        tasks_completed: 0,
        tasks_failed: 2,
        shadow_level: 'medium',
        completed_by_category: { hogar: 0 },
        total_by_category: { hogar: 2 }
    }
];

describe('Analytics - Agregador de Snapshot HistÃ³rico', () => {

    beforeEach(() => {
        // Reiniciamos el mock antes de cada test
        mockSelect.mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockDbResponse, error: null }),
        });
    });

    test('Debe devolver siempre un array con 7 registros (uno por cada dÃ­a)', async () => {
        const snapshot = await getHistoricalSnapshot('test-user');
        expect(snapshot).toHaveLength(7);
    });

    test('Debe devolver valores neutrales (0) para un dÃ­a sin actividad', async () => {
        const snapshot = await getHistoricalSnapshot('test-user');
        // El dÃ­a de anteayer no estÃ¡ en nuestro mock, asÃ­ que deberÃ­a ser neutral
        const twoDaysAgoString = new Date();
        twoDaysAgoString.setDate(new Date().getDate() - 2);
        const twoDaysAgoData = snapshot.find(s => s.date === twoDaysAgoString.toISOString().split('T')[0]);

        expect(twoDaysAgoData).toBeDefined();
        expect(twoDaysAgoData.totalTasks).toBe(0);
        expect(twoDaysAgoData.successRate).toBe(0);
        expect(twoDaysAgoData.shadowLevel).toBe('neutral');
        expect(twoDaysAgoData.successByCategory).toEqual({});
    });

    test('Debe calcular correctamente los porcentajes y estructurar los datos para un dÃ­a con actividad', async () => {
        const snapshot = await getHistoricalSnapshot('test-user');
        const todayString = new Date().toISOString().split('T')[0];
        const todayData = snapshot.find(s => s.date === todayString);

        expect(todayData).toBeDefined();
        expect(todayData.totalTasks).toBe(5);
        expect(todayData.totalSuccess).toBe(4);
        expect(todayData.totalFailed).toBe(1);
        expect(todayData.successRate).toBe(80); // 4 de 5
        expect(todayData.shadowLevel).toBe('low');
        expect(todayData.successByCategory['trabajo']).toBe(67); // 2 de 3, redondeado
        expect(todayData.successByCategory['hogar']).toBe(100); // 2 de 2
    });

    test('Debe manejar correctamente un dÃ­a con 0% de Ã©xito', async () => {
        const snapshot = await getHistoricalSnapshot('test-user');
        const yesterdayString = new Date();
        yesterdayString.setDate(new Date().getDate() - 1);
        const yesterdayData = snapshot.find(s => s.date === yesterdayString.toISOString().split('T')[0]);

        expect(yesterdayData).toBeDefined();
        expect(yesterdayData.successRate).toBe(0);
        expect(yesterdayData.successByCategory['hogar']).toBe(0);
    });
});

