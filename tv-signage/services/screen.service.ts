import { DataAccessLayer } from '../lib/data-access-layer';
import { validateRequest, ScreenSchema, validateScreenId } from '../lib/validation';
import { NotFoundError, APIError } from '../lib/error-handler';
import { logger } from '../lib/logger';
import { wsManager } from '../utils/websocket-server';
import path from 'path';

interface Screen {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastSeen: number;
  muted: boolean;
  location?: string;
  description?: string;
}

interface CreateScreenRequest {
  name: string;
  location?: string;
  description?: string;
}

interface UpdateScreenRequest {
  name?: string;
  status?: 'active' | 'inactive';
  muted?: boolean;
  location?: string;
  description?: string;
}

const SCREENS_FILE = path.join(process.cwd(), 'data', 'screens.json');

export class ScreenService {
  private dal = DataAccessLayer.getInstance();
  private wsManager: typeof wsManager;
  
  constructor(wsManagerInstance: typeof wsManager) {
    this.wsManager = wsManagerInstance;
  }
  
  async getScreens(): Promise<Screen[]> {
    try {
      const screens = await this.dal.readJsonFile<Screen[]>(SCREENS_FILE, []);
      const processedScreens = screens.map(screen => ({
        ...screen,
        muted: screen.muted !== false
      }));
      logger.debug(`Retrieved ${processedScreens.length} screens`);
      return processedScreens;
    } catch (error) {
      logger.error('Error getting screens', error);
      throw new APIError(500, 'Error al obtener pantallas');
    }
  }
  
  async getScreenById(id: string): Promise<Screen> {
    const screenId = validateScreenId(id);
    const screens = await this.getScreens();
    const screen = screens.find(s => s.id === screenId);
    
    if (!screen) {
      throw new NotFoundError('Screen');
    }
    
    return screen;
  }
  
  async createScreen(data: CreateScreenRequest): Promise<Screen> {
    const validatedData = validateRequest(ScreenSchema, data);
    const screens = await this.getScreens();
    
    const newScreen: Screen = {
      id: Date.now().toString(),
      name: validatedData.name,
      status: 'inactive',
      lastSeen: Date.now(),
      muted: true,
      location: validatedData.location,
      description: validatedData.description
    };
    
    screens.push(newScreen);
    await this.dal.writeJsonFile(SCREENS_FILE, screens);
    
    logger.info(`Created screen: ${newScreen.name} (${newScreen.id})`);
    this.wsManager.notifyContentUpdate();
    
    return newScreen;
  }
  
  async updateScreen(id: string, data: UpdateScreenRequest): Promise<Screen> {
    const screenId = validateScreenId(id);
    const screens = await this.getScreens();
    const screenIndex = screens.findIndex(s => s.id === screenId);
    
    if (screenIndex === -1) {
      throw new NotFoundError('Screen');
    }
    
    const updatedScreen: Screen = {
      ...screens[screenIndex],
      ...data,
      lastSeen: Date.now()
    };
    
    screens[screenIndex] = updatedScreen;
    await this.dal.writeJsonFile(SCREENS_FILE, screens);
    
    logger.info(`Updated screen: ${updatedScreen.name} (${updatedScreen.id})`);
    this.wsManager.notifyContentUpdate();
    
    return updatedScreen;
  }
  
  async updateScreenStatus(screenIds: string[], status: 'active' | 'inactive'): Promise<void> {
    const screens = await this.getScreens();
    const updatedScreens = screens.map(screen => 
      screenIds.includes(screen.id) 
        ? { ...screen, status, lastSeen: Date.now() } 
        : screen
    );
    
    await this.dal.writeJsonFile(SCREENS_FILE, updatedScreens);
    
    logger.info(`Updated status for screens: ${screenIds.join(', ')} to ${status}`);
    this.wsManager.notifyContentUpdate();
  }
  
  async deleteScreen(id: string): Promise<void> {
    const screenId = validateScreenId(id);
    const screens = await this.getScreens();
    const filteredScreens = screens.filter(s => s.id !== screenId);
    
    if (filteredScreens.length === screens.length) {
      throw new NotFoundError('Screen');
    }
    
    await this.dal.writeJsonFile(SCREENS_FILE, filteredScreens);
    
    logger.info(`Deleted screen: ${screenId}`);
    this.wsManager.notifyContentUpdate();
  }
  
  async updateLastSeen(id: string): Promise<void> {
    const screenId = validateScreenId(id);
    const screens = await this.getScreens();
    const screenIndex = screens.findIndex(s => s.id === screenId);
    
    if (screenIndex !== -1) {
      screens[screenIndex].lastSeen = Date.now();
      await this.dal.writeJsonFile(SCREENS_FILE, screens);
      logger.debug(`Updated last seen for screen: ${screenId}`);
    }
  }
}