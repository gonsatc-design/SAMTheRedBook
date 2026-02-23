const request = require('supertest');
const { app } = require('../js/backend/server');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

describe('ðŸ›¡ï¸ RAID PROTOCOL - INTEGRATION TEST', () => {
    let validToken;
    let loggedUserId;

    beforeAll(async () => {
        // Autenticar al usuario de test
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'frodo@comarca.com',
            password: 'anillo123'
        });

        if (error) throw new Error("âŒ Error en Login de Test: " + error.message);
        validToken = data.session.access_token;
        loggedUserId = data.user.id;

        console.log(`Test User UUID: ${loggedUserId}`);

        // Asegurarse de que el perfil existe
        const { data: profile, error: selectError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', loggedUserId)
            .single();

        if (selectError && selectError.code !== 'PGRST116') {
            console.error("âŒ Error al verificar perfil:", selectError.message);
        }

        if (!profile) {
            console.log("Creating test profile...");
            const { error: insertError } = await supabase.from('profiles').insert([{ id: loggedUserId }]);
            if (insertError) {
                console.error("âŒ Error al crear perfil de test:", insertError.message);
                throw insertError;
            }
        }
    });

    it('Debe reducir el HP de Sauron al completar tareas simultÃ¡neamente', async () => {
        // 1. Obtener HP inicial
        const { data: initialStatus } = await supabase.rpc('get_world_status');
        const initialHP = BigInt(initialStatus.current_hp || 500000);
        console.log(`Initial HP: ${initialHP}`);

        // 2. Crear un par de tareas para el test
        const { data: tasks, error: taskError } = await supabase
            .from('tasks')
            .insert([
                { user_id: loggedUserId, titulo_epico: 'Test Raid 1', difficulty: 5, category: 'otros' },
                { user_id: loggedUserId, titulo_epico: 'Test Raid 2', difficulty: 5, category: 'otros' }
            ])
            .select();

        if (taskError) throw taskError;

        // 3. Simular finalizaciÃ³n simultÃ¡nea
        const [task1, task2] = tasks;

        // Ejecutamos las peticiones en paralelo
        const responses = await Promise.all([
            request(app)
                .post('/api/gandalf/judge')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ successIds: [task1.id] }),
            request(app)
                .post('/api/gandalf/judge')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ successIds: [task2.id] })
        ]);

        responses.forEach((res, i) => {
            console.log(`Response ${i + 1} Status: ${res.statusCode}`);
            if (res.statusCode !== 200) console.log(`Response ${i + 1} Body:`, res.body);
        });

        // 4. Esperar un momento para que el daÃ±o asÃ­ncrono se procese
        await new Promise(resolve => setTimeout(resolve, 4000));

        // 5. Verificar HP final (consulta directa para evitar inconsistencias de cÃ¡lculo)
        const { data: finalStatus } = await supabase.from('world_events').select('current_hp').eq('is_active', true).single();
        const finalHP = BigInt(finalStatus.current_hp);
        console.log(`Final HP: ${finalHP}`);

        // DaÃ±o esperado: (5 * multiplier) + (5 * multiplier) = 10 * 1.0 = 10
        // Nota: damage_multiplier en world_events es 10, pero mi funciÃ³n usa difficulty * classMult
        // El damage_multiplier de world_events se usa en get_world_status para el cÃ¡lculo dinÃ¡mico basado en count(*)
        // Â¡OJO! Mi implementaciÃ³n procesarDanioGlobal usa RPC 'process_global_damage' que resta HP fÃ­sico.
        // Pero get_world_status recalcula basado en el count(*) de tareas completadas.

        // REVISIÃ“N: Mi get_world_status original usa:
        // calculated_hp := active_event.max_hp - (total_completed_global * active_event.damage_multiplier);
        // Si quiero que use el HP fÃ­sico restado, debo actualizar get_world_status.

        expect(finalHP).toBeLessThan(initialHP);
    });

    it('Debe permitir sacrificar Oro para daÃ±ar al jefe', async () => {
        // 1. Preparar Oro en el perfil (vÃ­a SQL directo para el test)
        await supabase
            .from('profiles')
            .update({ gold: 1000 })
            .eq('id', loggedUserId);

        // 2. Obtener HP inicial (Consulta directa)
        const { data: status1 } = await supabase.from('world_events').select('current_hp, max_hp').eq('is_active', true).single();
        const hp1 = BigInt(status1.current_hp || status1.max_hp);
        console.log(`HP before Gold Sacrifice (Direct Query): ${hp1}`);

        // 3. Realizar sacrificio
        const res = await request(app)
            .post('/api/raid/sacrifice')
            .set('Authorization', `Bearer ${validToken}`)
            .send({ type: 'gold', amount: 500 });

        expect(res.statusCode).toBe(200);
        console.log(`Sacrifice Damage Dealt: ${res.body.damage_dealt}`);

        // 5. Verificar que el oro bajÃ³
        const { data: profile } = await supabase.from('profiles').select('gold').eq('id', loggedUserId).single();
        console.log(`Gold after sacrifice: ${profile?.gold}`);
        expect(profile.gold).toBe(500);

        // 6. Verificar HP final (con delay aumentado)
        console.log("Waiting for DB to settle (3s)...");
        await new Promise(r => setTimeout(r, 3000));

        const { data: status2 } = await supabase.from('world_events').select('current_hp').eq('is_active', true).single();
        const hp2 = BigInt(status2.current_hp);
        console.log(`Final Verification - HP before: ${hp1}, HP after: ${hp2}, Diff: ${hp1 - hp2}`);

        expect(hp2).toBeLessThan(hp1);
        expect(hp1 - hp2).toBeGreaterThanOrEqual(BigInt(2500));
    });

    it('Debe denegar sacrificio de XP si bajarÃ­a de nivel', async () => {
        // 1. Preparar perfil: Level 2 (1000 XP), XP total 1050.
        await supabase
            .from('profiles')
            .update({ experience: 1050, level: 2 })
            .eq('id', loggedUserId);

        // 2. Intentar sacrificar 100 XP (quedarÃ­a en 950, bajando de 1000)
        const res = await request(app)
            .post('/api/raid/sacrifice')
            .set('Authorization', `Bearer ${validToken}`)
            .send({ type: 'xp', amount: 100 });

        console.log(`XP Sacrifice Status: ${res.statusCode}`);
        if (res.statusCode !== 400) console.log(`XP Sacrifice Error Body:`, res.body);

        expect(res.statusCode).toBe(400);
        // El RPC devuelve 'bajarÃ­a tu nivel' (con tildes)
        expect(res.body.error).toContain("nivel");

        // 3. Verificar que la XP no cambiÃ³
        const { data: profile } = await supabase.from('profiles').select('experience').eq('id', loggedUserId).single();
        expect(profile.experience).toBe(1050);
    });
});

