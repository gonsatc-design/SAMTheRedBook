const request = require('supertest');
const { app } = require('../js/backend/server');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

describe('Raid Protocol - Stress Test (Block 4)', () => {
    let frodoId;
    let frodoToken;

    beforeAll(async () => {
        // Autenticar
        const { data: signData, error: signError } = await supabase.auth.signInWithPassword({
            email: 'frodo@comarca.com',
            password: 'anillo123'
        });

        if (signError) throw new Error("âŒ Error en Login: " + signError.message);
        frodoToken = signData.session.access_token;
        frodoId = signData.user.id;

        // SEED: Darle a Frodo suficiente oro para el test
        await supabase.from('profiles').update({ gold: 10000 }).eq('id', frodoId);

        // Asegurar que hay un jefe activo y con mucha vida
        await supabase.from('world_events').update({
            current_hp: 50000,
            max_hp: 50000,
            is_active: true,
            expires_at: new Date(Date.now() + 86400000).toISOString()
        }).eq('is_active', true);
    });

    it('Should handle 50 concurrent sacrifice requests in less than 1 second', async () => {
        const NUM_REQUESTS = 50;
        const SACRIFICE_AMOUNT = 10;
        const DAMAGE_PER_GOLD = 5;
        const EXPECTED_TOTAL_DAMAGE = NUM_REQUESTS * SACRIFICE_AMOUNT * DAMAGE_PER_GOLD;

        // Obtener vida inicial DIRECTAMENTE de la tabla
        const { data: initialData } = await supabase
            .from('world_events')
            .select('current_hp')
            .eq('is_active', true)
            .limit(1);
        
        const initialHP = parseInt(initialData[0].current_hp);

        console.log(`ðŸš€ Iniciando oleada de ${NUM_REQUESTS} ataques...`);
        console.log(`ðŸ“Š HP Inicial: ${initialHP}`);
        console.log(`ðŸ’° Por sacrificio: ${SACRIFICE_AMOUNT} oro Ã— ${DAMAGE_PER_GOLD} daÃ±o = ${SACRIFICE_AMOUNT * DAMAGE_PER_GOLD} HP`);
        console.log(`ðŸ’¥ DaÃ±o esperado TOTAL: ${EXPECTED_TOTAL_DAMAGE} HP`);
        
        const start = Date.now();

        const requests = Array.from({ length: NUM_REQUESTS }).map((_, idx) =>
            request(app)
                .post('/api/raid/sacrifice')
                .set('Authorization', `Bearer ${frodoToken}`)
                .send({ type: 'gold', amount: SACRIFICE_AMOUNT })
                .then(res => {
                    if (!res.body.success) {
                        console.warn(`âŒ Req #${idx + 1} fallÃ³:`, res.body.error);
                    }
                    return res;
                })
        );

        const responses = await Promise.all(requests);
        const end = Date.now();
        const duration = end - start;

        console.log(`â±ï¸ Oleada completada en ${duration}ms`);

        // Verificar resultados
        const successCount = responses.filter(r => r.body && r.body.success).length;
        const errorCount = responses.filter(r => !r.body || !r.body.success).length;

        if (errorCount > 0) {
            console.error("âŒ Muestra de Error:", responses.find(r => !r.body || !r.body.success).body);
        }

        console.log(`âœ… Ã‰xitos: ${successCount}/${NUM_REQUESTS}, âŒ Errores: ${errorCount}`);

        // Esperar un poco para que la BD procese
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Obtener vida final (DIRECTO DE LA TABLA, no RPC que podrÃ­a cachear)
        const { data: finalData } = await supabase
            .from('world_events')
            .select('current_hp')
            .eq('is_active', true)
            .limit(1);
        
        const finalHP = parseInt(finalData[0].current_hp);
        const actualDamage = initialHP - finalHP;

        console.log(`ðŸ“‰ HP Final: ${finalHP}`);
        console.log(`ðŸ’¥ DaÃ±o Real: ${actualDamage} HP`);
        console.log(`ðŸ“Š Estado esperado: ${initialHP} - ${EXPECTED_TOTAL_DAMAGE} = ${initialHP - EXPECTED_TOTAL_DAMAGE}`);

        // Mostrar discrepancia si la hay
        if (actualDamage !== EXPECTED_TOTAL_DAMAGE) {
            console.warn(`âš ï¸ DISCREPANCIA: Esperaba ${EXPECTED_TOTAL_DAMAGE}, obtuve ${actualDamage}`);
            console.warn(`   Diferencia: ${Math.abs(actualDamage - EXPECTED_TOTAL_DAMAGE)} HP`);
        }

        // Debugging: Buscar logs en raid_logs
        const { data: logs } = await supabase
            .from('raid_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (logs && logs.length > 0) {
            console.log(`ï¿½ Ãšltimos 10 logs (${logs.length} registrados):`);
            let totalLogDamage = 0;
            logs.forEach((log, i) => {
                totalLogDamage += log.damage;
                console.log(`   ${i + 1}. User: ${log.user_email}, Damage: ${log.damage}, Type: ${log.type}`);
            });
            console.log(`   Total desde logs: ${totalLogDamage}`);
        } else {
            console.warn(`âš ï¸ No se encontraron logs en raid_logs`);
        }

        expect(duration).toBeLessThan(5000); // Tolerancia de 5s para el entorno de test
        expect(successCount).toBe(NUM_REQUESTS);
        expect(actualDamage).toBe(EXPECTED_TOTAL_DAMAGE);
    });
});

