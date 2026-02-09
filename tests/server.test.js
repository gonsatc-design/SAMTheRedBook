const request = require('supertest');
const { app } = require('../server'); // Importamos la app
const server = require('../server'); // Y el módulo completo para mockear

// Mockeamos el middleware de autenticación
jest.mock('../server', () => {
    const originalModule = jest.requireActual('../server');
    return {
        ...originalModule,
        authMiddleware: jest.fn((req, res, next) => {
            req.user = { id: process.env.TEST_USER_ID }; // Inyectamos un usuario de prueba VÁLIDO
            next();
        }),
    };
});

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

describe('Gandalf Judge Endpoint', () => {
    let testTask;
    const testUserId = process.env.TEST_USER_ID;

    beforeEach(async () => {
        const { data, error } = await supabase
            .from('tasks')
            .insert({
                user_id: testUserId,
                titulo_epico: 'Probar el Juicio de Mithrandir',
                is_completed: false,
                fallo_confirmado: false
            })
            .select()
            .single();
        if (error) throw new Error(`DB setup fallido: ${error.message}`);
        testTask = data;
    });

    afterEach(async () => {
        if (testTask) {
            await supabase.from('tasks').delete().eq('id', testTask.id);
        }
    });

    it('should mark a task as failed and set the failed_at timestamp', async () => {
        const response = await request(app)
            .post('/api/gandalf/judge')
            .send({ failureIds: [testTask.id] });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);

        const { data: updatedTask, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', testTask.id)
            .single();
        
        expect(error).toBeNull();
        expect(updatedTask.fallo_confirmado).toBe(true);
        expect(updatedTask.is_completed).toBe(false);
        expect(updatedTask.failed_at).not.toBeNull();
    });
});


