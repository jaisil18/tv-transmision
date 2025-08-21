import fs from 'fs/promises';
import path from 'path';

interface Screen {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastSeen: number;
  currentContent?: string;
  isRepeating?: boolean;
  muted?: boolean;
}

const SCREENS_FILE = path.join(process.cwd(), 'data', 'screens.json');
const HEARTBEAT_TIMEOUT = 5 * 60 * 1000; // 5 minutos en milisegundos

class ScreenStatusChecker {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private async ensureDataDirectory() {
    const dataDir = path.join(process.cwd(), 'data');
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  private async getScreens(): Promise<Screen[]> {
    try {
      await this.ensureDataDirectory();
      const content = await fs.readFile(SCREENS_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private async saveScreens(screens: Screen[]): Promise<void> {
    await this.ensureDataDirectory();
    await fs.writeFile(SCREENS_FILE, JSON.stringify(screens, null, 2));
  }

  private async checkScreensStatus(): Promise<void> {
    try {
      const screens = await this.getScreens();
      const currentTime = Date.now();
      let updatedCount = 0;

      const updatedScreens = screens.map(screen => {
        const timeSinceLastSeen = currentTime - screen.lastSeen;
        const shouldBeActive = timeSinceLastSeen < HEARTBEAT_TIMEOUT;
        const newStatus: 'active' | 'inactive' = shouldBeActive ? 'active' : 'inactive';

        if (screen.status !== newStatus) {
          console.log(`🔄 [StatusChecker] Pantalla ${screen.id} cambió de ${screen.status} a ${newStatus}`);
          console.log(`⏰ [StatusChecker] Último heartbeat: ${new Date(screen.lastSeen).toLocaleString()} (hace ${Math.round(timeSinceLastSeen / 1000)}s)`);
          updatedCount++;
        }

        return {
          ...screen,
          status: newStatus
        } as Screen;
      });

      if (updatedCount > 0) {
        await this.saveScreens(updatedScreens);
        console.log(`✅ [StatusChecker] ${updatedCount} pantallas actualizadas`);
      }

      // Log de estadísticas cada 5 minutos
      const activeScreens = updatedScreens.filter(s => s.status === 'active').length;
      const inactiveScreens = updatedScreens.filter(s => s.status === 'inactive').length;
      console.log(`📊 [StatusChecker] Estado actual: ${activeScreens} activas, ${inactiveScreens} inactivas`);

    } catch (error) {
      console.error('❌ [StatusChecker] Error al verificar estado de pantallas:', error);
    }
  }

  start(intervalMs: number = 60000): void { // Por defecto cada minuto
    if (this.isRunning) {
      console.warn('⚠️ [StatusChecker] El verificador ya está ejecutándose');
      return;
    }

    console.log(`🚀 [StatusChecker] Iniciando verificación periódica cada ${intervalMs / 1000}s`);
    console.log(`⏱️ [StatusChecker] Timeout de heartbeat: ${HEARTBEAT_TIMEOUT / 1000}s`);
    
    // Ejecutar inmediatamente una vez
    this.checkScreensStatus();
    
    // Luego ejecutar periódicamente
    this.intervalId = setInterval(() => {
      this.checkScreensStatus();
    }, intervalMs);
    
    this.isRunning = true;
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 [StatusChecker] Verificación periódica detenida');
  }

  async forceCheck(): Promise<void> {
    console.log('🔍 [StatusChecker] Verificación forzada del estado de pantallas');
    await this.checkScreensStatus();
  }

  getStatus(): { isRunning: boolean; intervalId: NodeJS.Timeout | null } {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId
    };
  }
}

// Singleton instance
export const screenStatusChecker = new ScreenStatusChecker();
export default screenStatusChecker;