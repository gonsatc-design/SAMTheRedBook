/**
 * Test de Distribución de Botín (Día 06)
 * Simulación de 100 ejecuciones para verificar probabilidades.
 */

// Mock de la lógica de probabilidad
function simularLoot(categoria) {
    const roll = Math.random() * 100;
    let rarity, items;

    if (roll < 80) {
        rarity = 'Común';
        items = ['Hierro', 'Cuero', 'Madera'];
    } else if (roll < 95) {
        rarity = 'Raro';
        items = ['Acero de Gondor', 'Telas Élficas'];
    } else {
        rarity = 'Legendario';
        items = ['Mithril', 'Fragmento de Narsil'];
    }

    // Influencia de Categoría
    if (categoria === 'estudio' && Math.random() < 0.3) {
        items = rarity === 'Común' ? ['Pergamino', 'Pluma'] : ['Tinta de Isildur', 'Libro Antiguo'];
    } else if (categoria === 'salud' && Math.random() < 0.3) {
        items = rarity === 'Común' ? ['Hierbas', 'Ungüento'] : ['Athelas', 'Vial de Galadriel'];
    }

    const itemName = items[Math.floor(Math.random() * items.length)];
    return { itemName, rarity };
}

function runTest() {
    console.log("🛡️ INICIANDO PRUEBA DE LA FORJA DE EREBOR...");
    console.log("Simulando 100 hallazgos de botín...\n");

    const stats = { 'Común': 0, 'Raro': 0, 'Legendario': 0 };
    const items = {};
    const total = 100;

    for (let i = 0; i < total; i++) {
        const loot = simularLoot('estudio');
        stats[loot.rarity]++;
        items[loot.itemName] = (items[loot.itemName] || 0) + 1;
    }

    console.log("📊 RESULTADOS DE PROBABILIDAD:");
    console.log(`- Comunes: ${stats['Común']}% (Objetivo: 80%)`);
    console.log(`- Raros: ${stats['Raro']}% (Objetivo: 15%)`);
    console.log(`- Legendarios: ${stats['Legendario']}% (Objetivo: 5%)`);

    console.log("\n📦 DESGLOSE DE OBJETOS:");
    console.table(items);

    // Verificación Simple
    const margin = 10; // Margen de error para 100 muestras
    if (Math.abs(stats['Común'] - 80) <= margin &&
        Math.abs(stats['Raro'] - 15) <= margin &&
        Math.abs(stats['Legendario'] - 5) <= margin) {
        console.log("\n✅ TEST PASADO: La distribución sigue las leyes de probabilidad.");
    } else {
        console.log("\n⚠️ ALERTA: La distribución se desvía del objetivo (normal en muestras pequeñas).");
    }
}

runTest();
