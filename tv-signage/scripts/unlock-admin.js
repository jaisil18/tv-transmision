#!/usr/bin/env node

/**
 * Script para desbloquear la cuenta de administrador
 */

const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

// Usuario desbloqueado con contraseña admin12345
const UNLOCKED_USER = {
  username: 'admin',
  password: '$2b$12$VO.SDgYdio2bTSsQGlqPyuDdo2ruGeBaHbgEKNNz8JbZJ/nrIrU4O', // admin12345
  loginAttempts: 0,
  lastLogin: new Date().toISOString()
};

async function unlockAdmin() {
  try {
    console.log('🔓 Desbloqueando cuenta de administrador...');
    
    // Crear directorio si no existe
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Escribir usuario desbloqueado
    fs.writeFileSync(USERS_FILE, JSON.stringify([UNLOCKED_USER], null, 2));
    
    console.log('✅ Cuenta desbloqueada exitosamente');
    console.log('📋 Credenciales:');
    console.log('   Usuario: admin');
    console.log('   Contraseña: admin12345');
    
    return true;
  } catch (error) {
    console.error('❌ Error desbloqueando cuenta:', error);
    return false;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  unlockAdmin();
}

module.exports = { unlockAdmin };
