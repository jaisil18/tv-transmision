import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// POST /api/system/restart - Reiniciar el servicio del sistema
export async function POST(request: Request) {
  try {
    console.log('🔄 [System Restart] Iniciando reinicio del servicio...');

    // Verificar si el comando service-restart existe en package.json
    try {
      const { stdout: packageInfo } = await execAsync('npm run service-restart --dry-run');
      console.log('✅ [System Restart] Comando service-restart encontrado');
    } catch (error) {
      console.warn('⚠️ [System Restart] Comando service-restart no encontrado, usando alternativa');
      
      // Alternativa: reiniciar usando PM2 si está disponible
      try {
        await execAsync('pm2 restart tv-signage');
        console.log('✅ [System Restart] Servicio reiniciado usando PM2');
        return NextResponse.json({
          success: true,
          message: 'Servicio reiniciado exitosamente usando PM2',
          method: 'pm2'
        });
      } catch (pm2Error) {
        console.warn('⚠️ [System Restart] PM2 no disponible, intentando reinicio manual');
        
        // Como último recurso, intentar matar el proceso actual
        // NOTA: Esto terminará el proceso actual, por lo que la respuesta puede no llegar
        setTimeout(() => {
          console.log('🔄 [System Restart] Ejecutando reinicio manual...');
          process.exit(0);
        }, 1000);
        
        return NextResponse.json({
          success: true,
          message: 'Reinicio manual iniciado - el servicio se reiniciará en 1 segundo',
          method: 'manual'
        });
      }
    }

    // Ejecutar el comando service-restart
    console.log('🔄 [System Restart] Ejecutando: npm run service-restart');
    
    // Ejecutar el comando en background para que no bloquee la respuesta
    const restartProcess = exec('npm run service-restart', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ [System Restart] Error al ejecutar service-restart:', error);
        return;
      }
      
      if (stderr) {
        console.warn('⚠️ [System Restart] Advertencias:', stderr);
      }
      
      console.log('✅ [System Restart] Salida:', stdout);
    });

    // Desconectar el proceso hijo para que continúe ejecutándose independientemente
    restartProcess.unref();

    console.log('✅ [System Restart] Comando de reinicio enviado exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Comando de reinicio del servicio enviado exitosamente',
      method: 'npm-script',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [System Restart] Error al reiniciar servicio:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Error al reiniciar el servicio',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// GET /api/system/restart - Obtener información sobre el reinicio del sistema
export async function GET() {
  try {
    // Verificar qué métodos de reinicio están disponibles
    const methods = [];
    
    // Verificar npm script
    try {
      await execAsync('npm run service-restart --dry-run');
      methods.push({
        name: 'npm-script',
        description: 'Reinicio usando npm run service-restart',
        available: true
      });
    } catch {
      methods.push({
        name: 'npm-script',
        description: 'Reinicio usando npm run service-restart',
        available: false
      });
    }
    
    // Verificar PM2
    try {
      await execAsync('pm2 list');
      methods.push({
        name: 'pm2',
        description: 'Reinicio usando PM2',
        available: true
      });
    } catch {
      methods.push({
        name: 'pm2',
        description: 'Reinicio usando PM2',
        available: false
      });
    }
    
    // Método manual siempre disponible
    methods.push({
      name: 'manual',
      description: 'Reinicio manual del proceso',
      available: true
    });

    return NextResponse.json({
      available: true,
      methods,
      currentTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [System Restart] Error al verificar métodos de reinicio:', error);
    
    return NextResponse.json(
      {
        available: false,
        error: 'Error al verificar métodos de reinicio disponibles'
      },
      { status: 500 }
    );
  }
}
