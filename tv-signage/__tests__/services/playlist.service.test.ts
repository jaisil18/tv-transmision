import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaylistService } from '../../services/playlist.service';
import { DataAccessLayer } from '../../lib/data-access-layer';
import { WebSocketManager } from '../../lib/websocket-server';

vi.mock('../../lib/data-access-layer');
vi.mock('../../lib/websocket-server');
vi.mock('../../lib/logger');

describe('PlaylistService', () => {
  let playlistService: PlaylistService;
  let mockDal: any;
  let mockWsManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockDal = {
      readJsonFile: vi.fn(),
      writeJsonFile: vi.fn()
    };
    vi.mocked(DataAccessLayer.getInstance).mockReturnValue(mockDal);
    
    mockWsManager = {
      notifyPlaylistUpdate: vi.fn()
    };
    
    playlistService = new PlaylistService(mockWsManager);
  });

  describe('getPlaylists', () => {
    it('should return all playlists', async () => {
      const mockPlaylists = [
        { id: '1', name: 'Playlist 1', items: [], screens: [] },
        { id: '2', name: 'Playlist 2', items: [], screens: [] }
      ];
      
      mockDal.readJsonFile.mockResolvedValue(mockPlaylists);
      
      const result = await playlistService.getPlaylists();
      
      expect(result).toEqual(mockPlaylists);
      expect(mockDal.readJsonFile).toHaveBeenCalled();
    });
  });

  describe('createPlaylist', () => {
    it('should create a new playlist', async () => {
      const mockExistingPlaylists = [];
      const newPlaylistData = { name: 'New Playlist' };
      
      mockDal.readJsonFile.mockResolvedValue(mockExistingPlaylists);
      mockDal.writeJsonFile.mockResolvedValue(undefined);
      
      const result = await playlistService.createPlaylist(newPlaylistData);
      
      expect(result).toMatchObject({
        name: 'New Playlist',
        items: [],
        screens: [],
        isActive: false
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(mockWsManager.notifyPlaylistUpdate).toHaveBeenCalled();
    });
  });

  describe('getPlaylistsByScreen', () => {
    it('should return active playlists for specific screen', async () => {
      const mockPlaylists = [
        { id: '1', name: 'Playlist 1', screens: ['screen1'], isActive: true },
        { id: '2', name: 'Playlist 2', screens: ['screen2'], isActive: true },
        { id: '3', name: 'Playlist 3', screens: ['screen1'], isActive: false }
      ];
      
      mockDal.readJsonFile.mockResolvedValue(mockPlaylists);
      
      const result = await playlistService.getPlaylistsByScreen('screen1');
      
      expect(result).toEqual([mockPlaylists[0]]);
    });
  });
});