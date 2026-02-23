const request = require('supertest');
const { app } = require('../js/backend/server'); 
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Cliente de Supabase para operaciones directas en DB y Auth
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

describe('ðŸ›¡ï¸ GANDALF JUDGE ENDPOINT (INTEGRATION)', () => {
    let testTask;
    let validToken; // AquÃ­ guardaremos la llave real
    const TEST_USER_ID = process.env.TEST_USER_ID; 

    // 1. ANTES DE NADA: CONSEGUIMOS UNA LLAVE REAL (LOGIN)
    beforeAll(async () => {
        // Usamos tus credenciales de desarrollo para obtener un token vÃ¡lido
        // NOTA: Si cambias la pass de Frodo, cÃ¡mbiala aquÃ­ tambiÃ©n.
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'frodo@comarca.com',
            password: 'anillo123'
        });

        if (error) throw new Error("âŒ Error en Login de Test: " + error.message);
        validToken = data.session.access_token;
    });

    // 2. ANTES DE CADA TEST: CREAMOS UNA TAREA DE PRUEBA
    beforeEach(async () => {
        // Limpieza preventiva por si quedÃ³ basura
        await supabase.from('tasks').delete().eq('titulo_epico', 'TEST_AUTO_GANDALF');

        const { data, error } = await supabase
            .from('tasks')
            .insert({
                user_id: TEST_USER_ID,
                titulo_epico: 'TEST_AUTO_GANDALF', // TÃ­tulo Ãºnico para identificarla
                categoria: 'estudio',
                is_completed: false,
                fallo_confirmado: false
            })
            .select()
            .single();

        if (error) throw new Error(`DB setup fallido: ${error.message}`);
        testTask = data;
    });

    // 3. DESPUÃ‰S DE CADA TEST: LIMPIAMOS LA SANGRE
    afterEach(async () => {
        if (testTask) {
            await supabase.from('tasks').delete().eq('id', testTask.id);
        }
    });

    // âš”ï¸ EL TEST DE FUEGO
    it('Debe marcar una tarea como fallida y activar la fecha de fallo', async () => {
        const response = await request(app)
            .post('/api/gandalf/judge')
            .set('Authorization', `Bearer ${validToken}`) // <--- Â¡AQUÃ ESTÃ LA CLAVE! Enviamos el token real
            .send({ failureIds: [testTask.id] });

        // Verificaciones
        expect(response.statusCode).toBe(200); // Ahora esperamos 200 OK
        expect(response.body.success).toBe(true);

        // Verificamos en la Base de Datos que Gandalf hizo su trabajo
        const { data: updatedTask, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', testTask.id)
            .single();
        
        expect(error).toBeNull();
        expect(updatedTask.fallo_confirmado).toBe(true); // Se marcÃ³ el fallo
        expect(updatedTask.is_completed).toBe(false);    // No estÃ¡ completada
        expect(updatedTask.failed_at).not.toBeNull();    // Tiene fecha de la horda
    });
});
