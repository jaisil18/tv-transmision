const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

console.log('🔧 [Reset Password] Reseteando contraseña de administrador...\n');

// Configuración
const usersFile = path.join(process.cwd(), 'data', 'users.json');
const defaultPassword = 'admin12345';

async function resetAdminPassword() {
  try {
    // Generar nuevo hash para la contraseña por defecto
    console.log('🔐 [Reset Password] Generando hash para contraseña:', defaultPassword);
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    console.log('🔐 [Reset Password] Hash generado:', hashedPassword);

    // Crear usuario por defecto
    const defaultUser = {
      username: 'admin',
      password: hashedPassword,
      loginAttempts: 0,
      lastLogin: null
    };

    // Verificar que la contraseña funciona
    const isValid = await bcrypt.compare(defaultPassword, hashedPassword);
    console.log('✅ [Reset Password] Verificación de hash:', isValid ? 'VÁLIDA' : 'INVÁLIDA');

    if (!isValid) {
      console.error('❌ [Reset Password] Error: El hash generado no es válido');
      return;
    }

    // Guardar usuario
    const users = [defaultUser];
    
    // Asegurar que existe el directorio
    const dataDir = path.dirname(usersFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 [Reset Password] Directorio data creado');
    }

    // Escribir archivo
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    console.log('💾 [Reset Password] Archivo users.json actualizado');

    // Verificar archivo
    const savedUsers = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    const savedUser = savedUsers[0];
    
    console.log('\n📋 [Reset Password] Usuario guardado:');
    console.log('   Username:', savedUser.username);
    console.log('   Password Hash:', savedUser.password);
    
    // Verificar contraseña guardada
    const finalCheck = await bcrypt.compare(defaultPassword, savedUser.password);
    console.log('   Verificación final:', finalCheck ? '✅ VÁLIDA' : '❌ INVÁLIDA');

    if (finalCheck) {
      console.log('\n🎉 [Reset Password] ¡Contraseña reseteada exitosamente!');
      console.log('\n📝 [Reset Password] Credenciales de acceso:');
      console.log('   👤 Usuario: admin');
      console.log('   🔑 Contraseña: admin12345');
      console.log('\n🌐 [Reset Password] Para acceder:');
      console.log('   1. Abre http://localhost:3000');
      console.log('   2. Haz clic en "Acceder al Panel de Administración"');
      console.log('   3. Usa las credenciales mostradas arriba');
    } else {
      console.error('❌ [Reset Password] Error: La verificación final falló');
    }

  } catch (error) {
    console.error('❌ [Reset Password] Error:', error);
  }
}

resetAdminPassword();
