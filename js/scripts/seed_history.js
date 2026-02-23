require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// USAMOS LA SERVICE_KEY PARA SALTARNOS EL RLS
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ID del usuario de prueba (Cárgalo desde .env o usa uno fijo si lo conoces)
// Si no tienes TEST_USER_ID en .env, tendrás que poner tu UUID real aquí abajo manualmente.
const USER_ID = process.env.TEST_USER_ID; 

async function seedHistory() {
    if (!USER_ID) {
        console.error("❌ ERROR: Necesito un TEST_USER_ID en el archivo .env para saber a quién inyectarle la historia.");
        return;
    }

    console.log(`🌱 Sembrando historia falsa para el usuario: ${USER_ID}...`);

    const logs = [];
    const today = new Date();

    // Generamos 7 días de historia
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (6 - i)); // Desde hace 6 días hasta hoy
        
        // Simulamos un escenario de "Creciente Sombra"
        // Días antiguos: Buenos. Días recientes: Malos.
        const isRecent = i > 3; 
        
        const totalTasks = Math.floor(Math.random() * 3) + 3; // 3 a 5 tareas
        const completed = isRecent ? 1 : totalTasks; // Recientes fallan casi todo
        const failed = totalTasks - completed;
        
        logs.push({
            user_id: USER_ID,
            log_date: date.toISOString(),
            tasks_total: totalTasks,
            tasks_completed: completed,
            tasks_failed: failed,
            shadow_level: isRecent ? 'high' : 'low',
            completed_by_category: { 'trabajo': completed },
            total_by_category: { 'trabajo': totalTasks }
        });
    }

    const { error } = await supabase.from('daily_logs').upsert(logs, { onConflict: 'user_id, log_date' });

    if (error) {
        console.error("❌ Error al sembrar:", error.message);
    } else {
        console.log("✅ Historia inyectada. El pasado ha sido reescrito.");
        console.log("🔮 Ahora el Palantír debería detectar una tendencia negativa reciente.");
    }
}

seedHistory();
