const request = require('supertest');
const { app } = require('../js/backend/server');
const { createClient } = require('@supabase/supabase-js');

// Reutilizamos el mock que ya definimos en stats.test.js si fuera el mismo archivo, 
// pero como es archivo nuevo, necesitamos definir el mock aquÃ­ tambiÃ©n.
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

describe('GET /api/stats/global', () => {
    let supabaseMock;

    beforeEach(() => {
        jest.clearAllMocks();
        supabaseMock = createClient();
    });

    test('Debe devolver el estado del jefe mundial correctamente', async () => {
        // Auth OK
        supabaseMock.auth.getUser.mockResolvedValue({
            data: { user: { id: 'frodo-baggins' } },
            error: null
        });

        // Mock RPC response
        const mockWorldStatus = {
            active: true,
            event_name: 'La Sombra de Sauron',
            max_hp: 500000,
            current_hp: 495000,
            total_damage_dealt: 5000,
            progress_percentage: 99
        };

        supabaseMock.rpc.mockResolvedValue({
            data: mockWorldStatus,
            error: null
        });

        const res = await request(app)
            .get('/api/stats/global')
            .set('Authorization', 'Bearer ring-token');

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.world_status).toEqual(mockWorldStatus);
        expect(supabaseMock.rpc).toHaveBeenCalledWith('get_world_status');
    });
});

