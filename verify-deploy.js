#!/usr/bin/env node

/**
 * VERIFICADOR RÁPIDO DE S.A.M.
 * Comprueba que todo esté listo para deploy
 */

const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function check(condition, message) {
    if (condition) {
        log(`  ✅ ${message}`, 'green');
        return true;
    } else {
        log(`  ❌ ${message}`, 'red');
        return false;
    }
}

log('\n🛡️  S.A.M. - VERIFICADOR DE DEPLOY\n', 'cyan');

let passed = 0;
let failed = 0;

// 1. Verificar archivos críticos
log('1️⃣  ARCHIVOS CRÍTICOS', 'blue');
passed += check(fs.existsSync('service-worker.js'), 'service-worker.js existe');
passed += check(fs.existsSync('index.html'), 'index.html existe');
passed += check(fs.existsSync('server.js'), 'server.js existe');
passed += check(fs.existsSync('client.js'), 'client.js existe');
passed += check(fs.existsSync('package.json'), 'package.json existe');
passed += check(fs.existsSync('manifest.json'), 'manifest.json existe');
passed += check(fs.existsSync('.env.example'), '.env.example existe');

// 2. Verificar README
log('\n2️⃣  DOCUMENTACIÓN', 'blue');
passed += check(fs.existsSync('README.md'), 'README.md existe');
passed += check(fs.existsSync('README-DEPLOY.md'), 'README-DEPLOY.md existe');

// 3. Verificar contenido .env.example
log('\n3️⃣  VARIABLES DE ENTORNO', 'blue');
const envContent = fs.readFileSync('.env.example', 'utf8');
passed += check(envContent.includes('SUPABASE_URL'), 'SUPABASE_URL en .env.example');
passed += check(envContent.includes('SUPABASE_KEY'), 'SUPABASE_KEY en .env.example');
passed += check(envContent.includes('GEMINI_API_KEY'), 'GEMINI_API_KEY en .env.example');
passed += check(envContent.includes('PORT'), 'PORT en .env.example');

// 4. Verificar Service Worker
log('\n4️⃣  SERVICE WORKER', 'blue');
const swContent = fs.readFileSync('service-worker.js', 'utf8');
passed += check(swContent.includes('self.addEventListener'), 'SW tiene event listeners');
passed += check(swContent.includes('CACHE_NAME'), 'SW define CACHE_NAME');
passed += check(swContent.includes('caches.open'), 'SW usa Cache API');

// 5. Verificar index.html
log('\n5️⃣  INDEX.HTML', 'blue');
const htmlContent = fs.readFileSync('index.html', 'utf8');
passed += check(htmlContent.includes('og:title'), 'Meta tags OG presentes');
passed += check(htmlContent.includes('twitter:card'), 'Twitter card presente');
passed += check(htmlContent.includes('service-worker.js'), 'Registro de SW presente');
passed += check(htmlContent.includes('manifest.json'), 'Link a manifest presente');
passed += check(htmlContent.includes('credits'), 'Easter egg credits presente');

// 6. Verificar server.js
log('\n6️⃣  SERVER.JS', 'blue');
const serverContent = fs.readFileSync('server.js', 'utf8');
passed += check(serverContent.includes('process.env.PORT'), 'process.env.PORT usado');
passed += check(serverContent.includes('ALLOWED_ORIGINS'), 'CORS restrictivo configurado');
passed += check(serverContent.includes('express'), 'Express require presente');

// 7. Verificar package.json
log('\n7️⃣  PACKAGE.JSON', 'blue');
const pkgContent = JSON.parse(fs.readFileSync('package.json', 'utf8'));
passed += check(pkgContent.scripts && pkgContent.scripts.start, 'Script "start" existe');
passed += check(pkgContent.scripts && pkgContent.scripts.dev, 'Script "dev" existe');
passed += check(pkgContent.dependencies && pkgContent.dependencies.express, 'Express en dependencies');
passed += check(pkgContent.dependencies && pkgContent.dependencies['@supabase/supabase-js'], 'Supabase en dependencies');

// 8. Verificar tests
log('\n8️⃣  TESTS', 'blue');
passed += check(fs.existsSync('jest.config.backend.js'), 'jest.config.backend.js existe');
passed += check(fs.existsSync('tests/'), 'Carpeta tests/ existe');

// Resultado final
log('\n═══════════════════════════════════════════════\n', 'cyan');
const total = passed + failed;
const percentage = Math.round((passed / total) * 100);

if (percentage === 100) {
    log(`✅ TODOS LOS CHECKS PASARON (${passed}/${total})`, 'green');
    log('\n🚀 ¡LISTO PARA DEPLOY!\n', 'green');
} else if (percentage >= 80) {
    log(`⚠️  MAJORITY CHECKS PASSED (${passed}/${total} - ${percentage}%)`, 'yellow');
    log('\n⏳ Revisa los ❌ arriba\n', 'yellow');
} else {
    log(`❌ FALTAN CHECKS (${passed}/${total} - ${percentage}%)`, 'red');
    log('\n🛠️  Completa los ❌ antes de deploy\n', 'red');
}

process.exit(percentage === 100 ? 0 : 1);
