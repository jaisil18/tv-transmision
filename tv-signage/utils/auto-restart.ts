import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface RestartEvent {
  timestamp: number;
  reason: string;
  filesAdded: string[];
}

class AutoRestartManager {
  private static instance: AutoRestartManager;
  private restartInProgress = false;
  private lastRestartTime = 0;
  private minRestartInterval = 30000; // 30 segundos mínimo entre reinicios

  static getInstance(): AutoRestartManager {
    if (!AutoRestartManager.instance) {
      AutoRestartManager.instance = new AutoRestartManager();
    }
    return AutoRestartManager.instance;
  }

  // Programar reinicio después de subir archivos
  async scheduleRestart(reason: string, filesAdded: string[] = []) {
    const now = Date.now();
    
    // Evitar reinicios muy frecuentes
    if (now - this.lastRestartTime < this.minRestartInterval) {
      console.log(`⏳ [AutoRestart] Reinicio programado muy pronto, esperando...`);
      return false;
    }

    if (this.restartInProgress) {
      console.log(`⏳ [AutoRestart] Reinicio ya en progreso, saltando...`);
      return false;
    }

    console.log(`🔄 [AutoRestart] Programando reinicio: ${reason}`);
    console.log(`📁 [AutoRestart] Archivos agregados: ${filesAdded.length}`);

    // Guardar evento de reinicio
    await this.logRestartEvent({ timestamp: now, reason, filesAdded });

    // Programar reinicio en 5 segundos para permitir que terminen otras operaciones
    setTimeout(async () => {
      await this.performRestart(reason);
    }, 5000);

    return true;
  }

  // Ejecutar el reinicio
  private async performRestart(reason: string) {
    if (this.restartInProgress) return;

    this.restartInProgress = true;
    this.lastRestartTime = Date.now();

    try {
      console.log(`🔄 [AutoRestart] Iniciando reinicio del servicio...`);
      console.log(`📝 [AutoRestart] Razón: ${reason}`);

      // Reiniciar el servicio systemd con timeout más largo
      await execAsync('timeout 60 systemctl restart tv-signage.service');
      
      console.log(`✅ [AutoRestart] Servicio reiniciado exitosamente`);
      
      // Esperar a que el servicio esté listo
      await this.waitForServiceReady();
      
      console.log(`🎉 [AutoRestart] Servicio listo para recibir conexiones`);

    } catch (error) {
      console.error(`❌ [AutoRestart] Error durante el reinicio:`, error);
    } finally {
      this.restartInProgress = false;
    }
  }

  // Esperar a que el servicio esté listo
  private async waitForServiceReady(maxWaitTime = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Verificar si el servicio responde
        await execAsync('curl -s -f http://localhost:3000/api/health || exit 1');
        console.log(`✅ [AutoRestart] Servicio respondiendo correctamente`);
        return true;
      } catch (error) {
        // Servicio aún no está listo, esperar un poco más
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.warn(`⚠️ [AutoRestart] Servicio tardó más de lo esperado en estar listo`);
    return false;
  }

  // Registrar eventos de reinicio
  private async logRestartEvent(event: RestartEvent) {
    try {
      const logFile = path.join(process.cwd(), 'data', 'restart-log.json');
      
      let events: RestartEvent[] = [];
      
      try {
        const existingData = await fs.readFile(logFile, 'utf8');
        events = JSON.parse(existingData);
      } catch (error) {
        // Archivo no existe, crear nuevo
      }

      events.push(event);
      
      // Mantener solo los últimos 20 eventos
      if (events.length > 20) {
        events = events.slice(-20);
      }

      // Crear directorio si no existe
      const dir = path.dirname(logFile);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(logFile, JSON.stringify(events, null, 2));
      
    } catch (error) {
      console.error('❌ [AutoRestart] Error guardando log:', error);
    }
  }

  // Verificar si hay un reinicio en progreso
  isRestartInProgress(): boolean {
    return this.restartInProgress;
  }

  // Obtener estadísticas de reinicios
  async getRestartStats() {
    try {
      const logFile = path.join(process.cwd(), 'data', 'restart-log.json');
      const data = await fs.readFile(logFile, 'utf8');
      const events: RestartEvent[] = JSON.parse(data);
      
      const last24h = events.filter(e => Date.now() - e.timestamp < 24 * 60 * 60 * 1000);
      
      return {
        totalRestarts: events.length,
        restartsLast24h: last24h.length,
        lastRestart: events[events.length - 1],
        isInProgress: this.restartInProgress
      };
    } catch (error) {
      return {
        totalRestarts: 0,
        restartsLast24h: 0,
        lastRestart: null,
        isInProgress: this.restartInProgress
      };
    }
  }
}

export default AutoRestartManager;
