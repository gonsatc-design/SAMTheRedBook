const { createClient } = require('@supabase/supabase-js');

// Este cliente es solo para esta librería, asumiendo que las credenciales están en el entorno
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Calcula el porcentaje de forma segura, evitando divisiones por cero.
 * @param {number} partial - El numerador.
 * @param {number} total - El denominador.
 * @returns {number} - El porcentaje calculado (0-100).
 */
const calculatePercentage = (partial, total) => {
    if (total === 0) return 0;
    return Math.round((partial / total) * 100);
};

/**
 * Recopila y estructura el historial de los últimos 7 días desde los registros diarios.
 * @param {string} userId - El UUID del usuario autenticado.
 * @returns {Promise<Array<Object>>} - Un array de 7 objetos, uno por cada día.
 */
async function getHistoricalSnapshot(userId) {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6); // Incluye hoy, así que retrocedemos 6 días

    // Normalizamos las fechas para evitar problemas de zona horaria en la consulta
    sevenDaysAgo.setHours(0, 0, 0, 0);
    today.setHours(23, 59, 59, 999);

    const { data: logs, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('log_date', sevenDaysAgo.toISOString())
        .lte('log_date', today.toISOString())
        .order('log_date', { ascending: false });

    if (error) {
        console.error("Error al consultar el Palantír (daily_logs):", error);
        throw new Error("No se pudo acceder a los archivos históricos.");
    }

    const snapshot = [];
    // Iteramos desde hoy hacia atrás 7 días
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0]; // Formato YYYY-MM-DD

        const logDelDia = logs.find(log => log.log_date.startsWith(dateString));

        if (logDelDia) {
            // Un día con actividad
            const totalSuccess = logDelDia.tasks_completed;
            const totalTasks = logDelDia.tasks_total;
            const categorias = logDelDia.completed_by_category || {}; // Asumimos JSON: {trabajo: 2, hogar: 1}
            const totalesCategoria = logDelDia.total_by_category || {}; // Asumimos JSON: {trabajo: 3, hogar: 1}

            snapshot.push({
                date: dateString,
                totalTasks: totalTasks,
                totalSuccess: totalSuccess,
                totalFailed: logDelDia.tasks_failed,
                successRate: calculatePercentage(totalSuccess, totalTasks),
                shadowLevel: logDelDia.shadow_level || 'neutral',
                // Calculamos el porcentaje para cada categoría encontrada
                successByCategory: Object.keys(totalesCategoria).reduce((acc, cat) => {
                    acc[cat] = calculatePercentage(categorias[cat] || 0, totalesCategoria[cat]);
                    return acc;
                }, {})
            });
        } else {
            // Un día sin actividad, devolvemos un objeto neutral
            snapshot.push({
                date: dateString,
                totalTasks: 0,
                totalSuccess: 0,
                totalFailed: 0,
                successRate: 0,
                shadowLevel: 'neutral',
                successByCategory: {}
            });
        }
    }

    return snapshot;
}

module.exports = { getHistoricalSnapshot };
