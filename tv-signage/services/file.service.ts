import { DataAccessLayer } from '../lib/data-access-layer';
import { validateRequest, FileUploadSchema, validateFileExtension } from '../lib/validation';
import { APIError, NotFoundError } from '../lib/error-handler';
import { logger } from '../lib/logger';
import { promises as fs } from 'fs';
import path from 'path';
import { wsManager } from '../utils/websocket-server';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: string;
  createdAt: number;
  isDirectory: boolean;
  url?: string;
}

interface UploadFileRequest {
  name: string;
  type: string;
  size: number;
  folder?: string;
  buffer: Buffer;
}

export class FileService {
  private dal = DataAccessLayer.getInstance();
  private wsManager: typeof wsManager;
  private readonly UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
  private readonly THUMBNAILS_DIR = path.join(process.cwd(), 'public', 'thumbnails');
  private readonly ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm', 'mov'];
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  
  constructor(wsManagerInstance: typeof wsManager) {
    this.wsManager = wsManagerInstance;
  }
  
  async getFiles(folder?: string): Promise<FileInfo[]> {
    try {
      const targetDir = folder ? path.join(this.UPLOADS_DIR, folder) : this.UPLOADS_DIR;
      
      if (!(await this.dal.fileExists(targetDir))) {
        return [];
      }
      
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      const files: FileInfo[] = [];
      
      for (const entry of entries) {
        const fullPath = path.join(targetDir, entry.name);
        const stats = await fs.stat(fullPath);
        const relativePath = path.relative(this.UPLOADS_DIR, fullPath);
        
        files.push({
          name: entry.name,
          path: relativePath,
          size: stats.size,
          type: entry.isDirectory() ? 'directory' : this.getFileType(entry.name),
          createdAt: stats.birthtime.getTime(),
          isDirectory: entry.isDirectory(),
          url: entry.isDirectory() ? undefined : `/uploads/${relativePath.replace(/\\/g, '/')}`
        });
      }
      
      return files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      logger.error('Error getting files', error);
      throw new APIError(500, 'Error al obtener archivos');
    }
  }
  
  async uploadFile(data: UploadFileRequest): Promise<FileInfo> {
    // Validar archivo
    if (data.size > this.MAX_FILE_SIZE) {
      throw new APIError(400, 'Archivo demasiado grande');
    }
    
    if (!validateFileExtension(data.name, this.ALLOWED_EXTENSIONS)) {
      throw new APIError(400, 'Tipo de archivo no permitido');
    }
    
    const validatedData = validateRequest(FileUploadSchema, {
      name: data.name,
      type: data.type,
      size: data.size,
      folder: data.folder
    });
    
    try {
      // Crear directorio si no existe
      const targetDir = validatedData.folder 
        ? path.join(this.UPLOADS_DIR, validatedData.folder)
        : this.UPLOADS_DIR;
      
      await this.dal.ensureDirectory(targetDir);
      
      // Generar nombre único si ya existe
      let fileName = validatedData.name;
      let counter = 1;
      let filePath = path.join(targetDir, fileName);
      
      while (await this.dal.fileExists(filePath)) {
        const ext = path.extname(validatedData.name);
        const nameWithoutExt = path.basename(validatedData.name, ext);
        fileName = `${nameWithoutExt}-${counter}${ext}`;
        filePath = path.join(targetDir, fileName);
        counter++;
      }
      
      // Guardar archivo
      await fs.writeFile(filePath, data.buffer);
      
      const stats = await fs.stat(filePath);
      const relativePath = path.relative(this.UPLOADS_DIR, filePath);
      
      const fileInfo: FileInfo = {
        name: fileName,
        path: relativePath,
        size: stats.size,
        type: this.getFileType(fileName),
        createdAt: stats.birthtime.getTime(),
        isDirectory: false,
        url: `/uploads/${relativePath.replace(/\\/g, '/')}`
      };
      
      logger.info(`Uploaded file: ${fileName} (${data.size} bytes)`);
      this.wsManager.notifyFileUploaded([fileName]);
      
      return fileInfo;
    } catch (error) {
      logger.error('Error uploading file', error);
      throw new APIError(500, 'Error al subir archivo');
    }
  }
  
  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.UPLOADS_DIR, filePath);
      
      if (!(await this.dal.fileExists(fullPath))) {
        throw new NotFoundError('Archivo');
      }
      
      await this.dal.deleteFile(fullPath);
      
      // Eliminar thumbnail si existe
      const thumbnailPath = path.join(this.THUMBNAILS_DIR, `${path.parse(filePath).name}.jpg`);
      if (await this.dal.fileExists(thumbnailPath)) {
        await this.dal.deleteFile(thumbnailPath);
      }
      
      logger.info(`Deleted file: ${filePath}`);
      this.wsManager.notifyContentUpdate();
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Error deleting file', error);
      throw new APIError(500, 'Error al eliminar archivo');
    }
  }
  
  async createFolder(name: string, parentFolder?: string): Promise<FileInfo> {
    try {
      const targetDir = parentFolder 
        ? path.join(this.UPLOADS_DIR, parentFolder, name)
        : path.join(this.UPLOADS_DIR, name);
      
      if (await this.dal.fileExists(targetDir)) {
        throw new APIError(400, 'La carpeta ya existe');
      }
      
      await this.dal.ensureDirectory(targetDir);
      
      const stats = await fs.stat(targetDir);
      const relativePath = path.relative(this.UPLOADS_DIR, targetDir);
      
      const folderInfo: FileInfo = {
        name,
        path: relativePath,
        size: 0,
        type: 'directory',
        createdAt: stats.birthtime.getTime(),
        isDirectory: true
      };
      
      logger.info(`Created folder: ${name}`);
      return folderInfo;
    } catch (error) {
      if (error instanceof APIError) throw error;
      logger.error('Error creating folder', error);
      throw new APIError(500, 'Error al crear carpeta');
    }
  }
  
  private getFileType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    
    if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      return 'image';
    }
    
    if (['.mp4', '.webm', '.mov'].includes(ext)) {
      return 'video';
    }
    
    return 'unknown';
  }
}