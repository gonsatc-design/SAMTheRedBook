const request = require('supertest');
const { app } = require('../js/backend/server'); // AsegÃºrate de exportar 'app' en server.js
const { createClient } = require('@supabase/supabase-js');

// Mock completo de Supabase
jest.mock('@supabase/supabase-js', () => {
    const mockRpc = jest.fn();
    const mockAuthGetUser = jest.fn();

    return {
        createClient: jest.fn(() => ({
            rpc: mockRpc,
            auth: {
                getUser: mockAuthGetUser
            }
        }))
    };
});

describe('GET /api/stats/personal', () => {
    let supabaseMock;

    beforeEach(() => {
        // Resetear mocks antes de cada test
        jest.clearAllMocks();
        supabaseMock = createClient();
    });

    test('Debe devolver 401 si no hay token', async () => {
        const res = await request(app).get('/api/stats/personal');
        expect(res.statusCode).toBe(401);
    });

    test('Debe devolver stats correctamente cuando el token es vÃ¡lido', async () => {
        // 1. Mockear autenticaciÃ³n exitosa
        supabaseMock.auth.getUser.mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null
        });

        // 2. Mockear respuesta de la funciÃ³n RPC
        const mockStats = {
            summary: {
                total_tasks: 10,
                completed_tasks: 8,
                combat_effectiveness: 80
            },
            categories: { "trabajo": 5, "salud": 5 },
            history: []
        };

        supabaseMock.rpc.mockResolvedValue({
            data: mockStats,
            error: null
        });

        // 3. Hacer la peticiÃ³n
        const res = await request(app)
            .get('/api/stats/personal')
            .set('Authorization', 'Bearer fake-token');

        // 4. Validaciones
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.stats).toEqual(mockStats);

        // Verificar que se llamÃ³ a la funciÃ³n RPC correcta
        expect(supabaseMock.rpc).toHaveBeenCalledWith('get_weekly_stats');
    });

    test('Debe manejar errores de Supabase', async () => {
        // Mockear auth ok
        supabaseMock.auth.getUser.mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null
        });

        // Mockear error en RPC
        supabaseMock.rpc.mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
        });

        const res = await request(app)
            .get('/api/stats/personal')
            .set('Authorization', 'Bearer fake-token');

        expect(res.statusCode).toBe(500);
        expect(res.body.success).toBe(false);
    });
});

