const request = require('supertest');
const { app } = require('../js/backend/server');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

describe('ðŸ›¡ï¸ DURIN\'S ANVIL - CRAFTING TEST (INTEGRATION)', () => {
    let validToken;
    const TEST_USER_ID = process.env.TEST_USER_ID;

    beforeAll(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'frodo@comarca.com',
            password: 'anillo123'
        });

        if (error) throw new Error("âŒ Error en Login de Test: " + error.message);
        validToken = data.session.access_token;
    });

    it('Debe devolver error 400 cuando los recursos son insuficientes', async () => {
        // Asumiendo que Frodo no tiene 5 Hierro y 2 Cuero al inicio del test
        // Primero nos aseguramos de limpiar su inventario de esos items especÃ­ficos para el test
        await supabase
            .from('inventory')
            .delete()
            .eq('user_id', TEST_USER_ID)
            .in('item_name', ['Hierro', 'Cuero']);

        const response = await request(app)
            .post('/api/forge/craft')
            .set('Authorization', `Bearer ${validToken}`)
            .send({ recetaNombre: 'Amuleto de Enfoque' });

        if (response.statusCode !== 400) {
            console.log("âŒ RESPONSE ERROR:", response.body);
        }

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain("Recursos insuficientes");
    });

    it('Debe devolver error 400 si la receta no existe', async () => {
        const response = await request(app)
            .post('/api/forge/craft')
            .set('Authorization', `Bearer ${validToken}`)
            .send({ recetaNombre: 'Anillo Unico Mock' });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain("La receta no existe");
    });
});

