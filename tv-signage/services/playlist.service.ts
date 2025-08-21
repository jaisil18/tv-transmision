import { DataAccessLayer } from '../lib/data-access-layer';
import { validateRequest, PlaylistSchema, validatePlaylistId } from '../lib/validation';
import { NotFoundError, APIError } from '../lib/error-handler';
import { logger } from '../lib/logger';
import wsManager from '../utils/websocket-server';
import path from 'path';

interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  screens: string[];
  folder?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

interface PlaylistItem {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  duration?: number;
  order: number;
}

interface CreatePlaylistRequest {
  name: string;
  folder?: string;
  screens?: string[];
}

interface UpdatePlaylistRequest {
  name?: string;
  items?: PlaylistItem[];
  screens?: string[];
  isActive?: boolean;
}

export class PlaylistService {
  private dal = DataAccessLayer.getInstance();
  private wsManager: typeof wsManager;
  private readonly PLAYLISTS_FILE = path.join(process.cwd(), 'data', 'playlists.json');
  
  constructor(wsManagerInstance: typeof wsManager) {
    this.wsManager = wsManagerInstance;
  }
  
  async getPlaylists(): Promise<Playlist[]> {
    try {
      const playlists = await this.dal.readJsonFile<Playlist[]>(this.PLAYLISTS_FILE, []);
      logger.debug(`Retrieved ${playlists.length} playlists`);
      return playlists;
    } catch (error) {
      logger.error('Error getting playlists', error);
      throw new APIError(500, 'Error al obtener playlists');
    }
  }
  
  async getPlaylistById(id: string): Promise<Playlist> {
    const playlistId = validatePlaylistId(id);
    const playlists = await this.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    
    if (!playlist) {
      throw new NotFoundError('Playlist');
    }
    
    return playlist;
  }
  
  async createPlaylist(data: CreatePlaylistRequest): Promise<Playlist> {
    const validatedData = validateRequest(PlaylistSchema, data);
    const playlists = await this.getPlaylists();
    
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: validatedData.name,
      items: [],
      screens: validatedData.screens || [],
      folder: validatedData.folder,
      isActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    playlists.push(newPlaylist);
    await this.dal.writeJsonFile(this.PLAYLISTS_FILE, playlists);
    
    logger.info(`Created playlist: ${newPlaylist.name} (${newPlaylist.id})`);
    this.wsManager.notifyPlaylistUpdate(newPlaylist.id, newPlaylist.screens);

    return newPlaylist;
  }
  
  async updatePlaylist(id: string, data: UpdatePlaylistRequest): Promise<Playlist> {
    const playlistId = validatePlaylistId(id);
    const playlists = await this.getPlaylists();
    const playlistIndex = playlists.findIndex(p => p.id === playlistId);
    
    if (playlistIndex === -1) {
      throw new NotFoundError('Playlist');
    }
    
    const updatedPlaylist: Playlist = {
      ...playlists[playlistIndex],
      ...data,
      updatedAt: Date.now()
    };
    
    playlists[playlistIndex] = updatedPlaylist;
    await this.dal.writeJsonFile(this.PLAYLISTS_FILE, playlists);
    
    logger.info(`Updated playlist: ${updatedPlaylist.name} (${updatedPlaylist.id})`);
    this.wsManager.notifyPlaylistUpdate(updatedPlaylist.id, updatedPlaylist.screens);

    return updatedPlaylist;
  }
  
  async deletePlaylist(id: string): Promise<void> {
    const playlistId = validatePlaylistId(id);
    const playlists = await this.getPlaylists();
    const filteredPlaylists = playlists.filter(p => p.id !== playlistId);
    
    if (filteredPlaylists.length === playlists.length) {
      throw new NotFoundError('Playlist');
    }
    
    await this.dal.writeJsonFile(this.PLAYLISTS_FILE, filteredPlaylists);
    
    logger.info(`Deleted playlist: ${playlistId}`);
    this.wsManager.notifyPlaylistUpdate(playlistId, []);
  }
  
  async getPlaylistsByScreen(screenId: string): Promise<Playlist[]> {
    const playlists = await this.getPlaylists();
    return playlists.filter(playlist => 
      playlist.screens.includes(screenId) && playlist.isActive
    );
  }
}