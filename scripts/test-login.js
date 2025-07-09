const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

console.log('🔍 [Test Login] Verificando credenciales de login...\n');

// Leer archivo de usuarios
const usersFile = path.join(process.cwd(), 'data', 'users.json');

if (!fs.existsSync(usersFile)) {
  console.log('❌ [Test Login] Archivo users.json no encontrado');
  process.exit(1);
}

const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
console.log('📋 [Test Login] Usuarios encontrados:', users.length);

users.forEach((user, index) => {
  console.log(`\n👤 [Test Login] Usuario ${index + 1}:`);
  console.log(`   Username: ${user.username}`);
  console.log(`   Password Hash: ${user.password}`);
  console.log(`   Login Attempts: ${user.loginAttempts || 0}`);
  console.log(`   Last Login: ${user.lastLogin || 'Nunca'}`);
  
  // Verificar contraseñas comunes
  const commonPasswords = ['admin', 'admin123', 'admin12345', 'password', '123456'];
  
  console.log('   🔐 Probando contraseñas comunes:');
  
  commonPasswords.forEach(password => {
    const isValid = bcrypt.compareSync(password, user.password);
    console.log(`      "${password}": ${isValid ? '✅ VÁLIDA' : '❌ Inválida'}`);
  });
});

console.log('\n📝 [Test Login] Credenciales por defecto del sistema:');
console.log('   Username: admin');
console.log('   Password: admin12345');

console.log('\n🧪 [Test Login] Para probar el login:');
console.log('   1. Abre http://localhost:3000');
console.log('   2. Haz clic en "Acceder al Panel de Administración"');
console.log('   3. Usa las credenciales mostradas arriba');

console.log('\n🔧 [Test Login] Si el login no funciona:');
console.log('   1. Verifica que el servidor esté ejecutándose');
console.log('   2. Revisa la consola del navegador para errores');
console.log('   3. Verifica que las cookies estén habilitadas');
console.log('   4. Intenta en modo incógnito');
