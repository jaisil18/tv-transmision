import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ScreenService } from '../../services/screen.service';
import { DataAccessLayer } from '../../lib/data-access-layer';
import { WebSocketManager } from '../../lib/websocket-server';

// Mock dependencies
vi.mock('../../lib/data-access-layer');
vi.mock('../../lib/websocket-server');
vi.mock('../../lib/logger');

describe('ScreenService', () => {
  let screenService: ScreenService;
  let mockDal: any;
  let mockWsManager: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock DataAccessLayer
    mockDal = {
      readJsonFile: vi.fn(),
      writeJsonFile: vi.fn()
    };
    vi.mocked(DataAccessLayer.getInstance).mockReturnValue(mockDal);
    
    // Mock WebSocketManager
    mockWsManager = {
      notifyContentUpdate: vi.fn(),
      notifyScreenUpdate: vi.fn()
    };
    
    screenService = new ScreenService(mockWsManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getScreens', () => {
    it('should return screens with default muted state', async () => {
      const mockScreens = [
        { id: '1', name: 'Screen 1', status: 'active' },
        { id: '2', name: 'Screen 2', status: 'inactive', muted: false }
      ];
      
      mockDal.readJsonFile.mockResolvedValue(mockScreens);
      
      const result = await screenService.getScreens();
      
      expect(result).toEqual([
        { id: '1', name: 'Screen 1', status: 'active', muted: true },
        { id: '2', name: 'Screen 2', status: 'inactive', muted: false }
      ]);
      expect(mockDal.readJsonFile).toHaveBeenCalledWith(expect.any(String), []);
    });

    it('should return empty array when file does not exist', async () => {
      mockDal.readJsonFile.mockResolvedValue([]);
      
      const result = await screenService.getScreens();
      
      expect(result).toEqual([]);
    });
  });

  describe('createScreen', () => {
    it('should create a new screen with valid data', async () => {
      const mockExistingScreens = [];
      const newScreenData = { name: 'New Screen' };
      
      mockDal.readJsonFile.mockResolvedValue(mockExistingScreens);
      mockDal.writeJsonFile.mockResolvedValue(undefined);
      
      const result = await screenService.createScreen(newScreenData);
      
      expect(result).toMatchObject({
        name: 'New Screen',
        status: 'inactive',
        muted: true
      });
      expect(result.id).toBeDefined();
      expect(result.lastSeen).toBeDefined();
      expect(mockDal.writeJsonFile).toHaveBeenCalled();
    });

    it('should throw validation error for invalid data', async () => {
      const invalidData = { name: '' };
      
      await expect(screenService.createScreen(invalidData))
        .rejects
        .toThrow('Datos de entrada inválidos');
    });
  });

  describe('updateScreenStatus', () => {
    it('should update status for specified screens', async () => {
      const mockScreens = [
        { id: '1', name: 'Screen 1', status: 'inactive' },
        { id: '2', name: 'Screen 2', status: 'inactive' },
        { id: '3', name: 'Screen 3', status: 'active' }
      ];
      
      mockDal.readJsonFile.mockResolvedValue(mockScreens);
      mockDal.writeJsonFile.mockResolvedValue(undefined);
      
      await screenService.updateScreenStatus(['1', '2'], 'active');
      
      expect(mockDal.writeJsonFile).toHaveBeenCalledWith(
        expect.any(String),
        [
          { id: '1', name: 'Screen 1', status: 'active' },
          { id: '2', name: 'Screen 2', status: 'active' },
          { id: '3', name: 'Screen 3', status: 'active' }
        ]
      );
      expect(mockWsManager.notifyContentUpdate).toHaveBeenCalled();
    });
  });

  describe('getScreenById', () => {
    it('should return screen when found', async () => {
      const mockScreens = [
        { id: '1', name: 'Screen 1', status: 'active', muted: true }
      ];
      
      mockDal.readJsonFile.mockResolvedValue(mockScreens);
      
      const result = await screenService.getScreenById('1');
      
      expect(result).toEqual(mockScreens[0]);
    });

    it('should throw NotFoundError when screen not found', async () => {
      mockDal.readJsonFile.mockResolvedValue([]);
      
      await expect(screenService.getScreenById('999'))
        .rejects
        .toThrow('Screen no encontrado');
    });
  });
});