// VERIFICACIÓN RÁPIDA: Dev Mode Time Travel
// Copia y pega en la consola (F12) cuando estés en /?dev=true

console.log('🧙‍♂️ VERIFICANDO MODO DEVELOPER...\n');

// 1. Verificar que devPanel existe
const devPanel = document.getElementById('devPanel');
console.log('✅ 1. devPanel existe:', !!devPanel);
console.log('   - ¿Está visible?:', !devPanel.classList.contains('hidden'));

// 2. Verificar que los inputs existen
const daysInput = document.getElementById('daysOffset');
const travelBtn = document.getElementById('timeTravelBtn');
console.log('✅ 2. Input daysOffset existe:', !!daysInput);
console.log('✅ 3. Botón Viajar existe:', !!travelBtn);

// 3. Simular un viaje en el tiempo
console.log('\n📅 PROBANDO VIAJE EN EL TIEMPO...');
console.log('Fecha actual:', new Date().toLocaleDateString());

const offset = 3;
const mockDate = new Date();
mockDate.setDate(mockDate.getDate() + offset);
console.log(`✅ 4. Fecha simulada (+${offset} días):`, mockDate.toLocaleDateString());

// 4. Verificar que cargarMisiones está disponible
console.log('✅ 5. cargarMisiones() está disponible:', typeof window.cargarMisiones === 'function');

// 5. RESUMEN
console.log('\n🎯 RESUMEN:');
console.log(devPanel.classList.contains('hidden') 
  ? '❌ PROBLEMA: Panel está oculto. Recuerda usar /?dev=true' 
  : '✅ Panel visible. Listo para viajar en el tiempo.');

console.log('\n💡 Para viajar:');
console.log('   document.getElementById("daysOffset").value = 3;');
console.log('   document.getElementById("timeTravelBtn").click();');
