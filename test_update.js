#!/usr/bin/env node

/**
 * Test verificar si UPDATE directo funciona
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

async function main() {
    console.log('\n🧪 TEST: Verificar si UPDATE funciona\n');
    
    // 1. Leer HP actual
    const { data: before } = await supabase
        .from('world_events')
        .select('current_hp')
        .eq('is_active', true)
        .limit(1);
    
    console.log(`1️⃣  HP Antes: ${before[0].current_hp}`);
    
    // 2. Hacer UPDATE directo (sin RPC)
    const { error: updateError } = await supabase
        .from('world_events')
        .update({ current_hp: 490000 })
        .eq('is_active', true);
    
    if (updateError) {
        console.error(`   ❌ Error UPDATE:`, updateError);
        return;
    }
    console.log(`2️⃣  UPDATE ejecutado`);
    
    // 3. Leer HP nuevamente (sin delay)
    const { data: after1 } = await supabase
        .from('world_events')
        .select('current_hp')
        .eq('is_active', true)
        .limit(1);
    
    console.log(`3️⃣  HP Después (sin delay): ${after1[0].current_hp}`);
    
    // 4. Esperar y leer
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: after2 } = await supabase
        .from('world_events')
        .select('current_hp')
        .eq('is_active', true)
        .limit(1);
    
    console.log(`4️⃣  HP Después (1s delay): ${after2[0].current_hp}`);
    
    // 5. Intentar con RPC
    const { data: rpcStatus } = await supabase.rpc('get_world_status');
    console.log(`5️⃣  RPC get_world_status(): ${rpcStatus.current_hp}`);
}

main();
