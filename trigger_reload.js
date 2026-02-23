const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY);

async function reload() {
    try {
        console.log("Triggering schema reload...");
        const { data, error } = await supabase.rpc('reload_schema_aggressive', {});
        if (error) console.error("Error reloading:", error);
        else console.log("Reload successful:", data);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

reload();
