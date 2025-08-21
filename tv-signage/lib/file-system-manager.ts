import { readdir, stat, mkdir, unlink, rmdir, writeFile } from 'fs/promises';
import { join, extname, basename, dirname } from 'path';
import { EventEmitter } from 'events';
import { watch } from 'fs';
import { getURLConfig, buildMediaURL } from './url-config';
import { BASE_PATH } from './path-config'; // ✅ Solo un import aquí

export interface FileItem {
  name: string;
  path: string;
  relativePath: string;
  url: string;
  size: number;
  modified: Date;
  type: 'file' | 'directory';
  mediaType?: 'video' | 'image' | 'other';
  extension?: string;
}

export interface FolderInfo {
  name: string;
  path: string;
  relativePath: string;
  itemCount: number;
  totalSize: number;
  created: Date;
  modified: Date;
}

interface FileSystemConfig {
  basePath: string;
  serverUrl: string;
  allowedExtensions: string[];
  maxFileSize: number; // en bytes
}

export class FileSystemManager extends EventEmitter {
  private config: FileSystemConfig;
  private watchers: Map<string, any> = new Map();

  constructor(config: FileSystemConfig) {
    super();
    this.config = config;
  }

  /**
   * Obtener lista de carpetas en el directorio base
   */
  async getFolders(): Promise<FolderInfo[]> {
    try {
      const entries = await readdir(this.config.basePath);
      const folders: FolderInfo[] = [];

      for (const entry of entries) {
        const fullPath = join(this.config.basePath, entry);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          const folderInfo = await this.getFolderInfo(entry);
          folders.push(folderInfo);
        }
      }

      return folders.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('❌ [FileSystem] Error al obtener carpetas:', error);
      return [];
    }
  }

  /**
   * Obtener información de una carpeta específica
   */
  async getFolderInfo(folderName: string): Promise<FolderInfo> {
    const folderPath = join(this.config.basePath, folderName);
    const stats = await stat(folderPath);
    
    // Contar archivos y calcular tamaño total
    const files = await this.getFilesInFolder(folderName);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    return {
      name: folderName,
      path: folderPath,
      relativePath: folderName,
      itemCount: files.length,
      totalSize,
      created: stats.birthtime,
      modified: stats.mtime
    };
  }

  /**
   * Obtener archivos en una carpeta específica
   */
  async getFilesInFolder(folderName: string): Promise<FileItem[]> {
    try {
      const folderPath = join(this.config.basePath, folderName);
      const entries = await readdir(folderPath);
      const files: FileItem[] = [];

      for (const entry of entries) {
        const fullPath = join(folderPath, entry);
        const stats = await stat(fullPath);
        const relativePath = join(folderName, entry);

        if (stats.isFile()) {
          const ext = extname(entry).toLowerCase();

          const fileItem: FileItem = {
            name: entry,
            path: fullPath,
            relativePath,
            url: buildMediaURL(relativePath),
            size: stats.size,
            modified: stats.mtime,
            type: 'file',
            extension: ext,
            mediaType: this.getMediaType(ext)
          };

          files.push(fileItem);
        } else if (stats.isDirectory()) {
          const fileItem: FileItem = {
            name: entry,
            path: fullPath,
            relativePath,
            url: '',
            size: 0,
            modified: stats.mtime,
            type: 'directory'
          };

          files.push(fileItem);
        }
      }

      return files.sort((a, b) => {
        // Directorios primero, luego archivos
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error(`❌ [FileSystem] Error al obtener archivos de ${folderName}:`, error);
      return [];
    }
  }

  /**
   * Crear una nueva carpeta
   */
  async createFolder(folderName: string): Promise<{ success: boolean; message: string; folder?: FolderInfo }> {
    try {
      // Validar nombre de carpeta
      if (!folderName || folderName.trim() === '') {
        return { success: false, message: 'El nombre de la carpeta no puede estar vacío' };
      }

      // Sanitizar nombre
      const sanitizedName = folderName.trim().replace(/[<>:"/\\|?*]/g, '_');
      const folderPath = join(this.config.basePath, sanitizedName);

      // Verificar si ya existe
      try {
        await stat(folderPath);
        return { success: false, message: 'La carpeta ya existe' };
      } catch {
        // La carpeta no existe, podemos crearla
      }

      // Crear carpeta
      await mkdir(folderPath, { recursive: true });
      
      // Obtener información de la carpeta creada
      const folderInfo = await this.getFolderInfo(sanitizedName);

      console.log(`✅ [FileSystem] Carpeta creada: ${sanitizedName}`);
      this.emit('folderCreated', folderInfo);

      return { 
        success: true, 
        message: 'Carpeta creada exitosamente',
        folder: folderInfo
      };
    } catch (error) {
      console.error('❌ [FileSystem] Error al crear carpeta:', error);
      return { success: false, message: 'Error al crear la carpeta' };
    }
  }

  /**
   * Eliminar una carpeta (solo si está vacía)
   */
  async deleteFolder(folderName: string): Promise<{ success: boolean; message: string }> {
    try {
      const folderPath = join(this.config.basePath, folderName);
      
      // Verificar que la carpeta existe
      const stats = await stat(folderPath);
      if (!stats.isDirectory()) {
        return { success: false, message: 'No es una carpeta válida' };
      }

      // Verificar que está vacía
      const files = await this.getFilesInFolder(folderName);
      if (files.length > 0) {
        return { success: false, message: 'La carpeta debe estar vacía para eliminarla' };
      }

      // Eliminar carpeta
      await rmdir(folderPath);

      console.log(`✅ [FileSystem] Carpeta eliminada: ${folderName}`);
      this.emit('folderDeleted', folderName);

      return { success: true, message: 'Carpeta eliminada exitosamente' };
    } catch (error) {
      console.error('❌ [FileSystem] Error al eliminar carpeta:', error);
      return { success: false, message: 'Error al eliminar la carpeta' };
    }
  }

  /**
   * Eliminar un archivo
   */
  async deleteFile(folderName: string, fileName: string): Promise<{ success: boolean; message: string }> {
    try {
      const relativePath = join(folderName, fileName);
      const fullPath = join(this.config.basePath, relativePath);

      // Verificar que el archivo existe
      const stats = await stat(fullPath);
      if (!stats.isFile()) {
        return { success: false, message: 'No es un archivo válido' };
      }

      // Eliminar archivo
      await unlink(fullPath);

      console.log(`✅ [FileSystem] Archivo eliminado: ${relativePath}`);
      this.emit('fileDeleted', { folderName, fileName, relativePath });

      return { success: true, message: 'Archivo eliminado exitosamente' };
    } catch (error) {
      console.error('❌ [FileSystem] Error al eliminar archivo:', error);
      return { success: false, message: 'Error al eliminar el archivo' };
    }
  }

  /**
   * Subir un archivo a una carpeta específica
   */
  async uploadFile(folderName: string, file: File): Promise<{ success: boolean; message: string; url?: string }> {
    try {
      // Validar archivo
      if (!file || !file.name) {
        return { success: false, message: 'Archivo inválido' };
      }

      // Verificar extensión permitida
      if (!this.isFileAllowed(file.name)) {
        return { success: false, message: 'Tipo de archivo no permitido' };
      }

      // Verificar tamaño
      if (file.size > this.config.maxFileSize) {
        return {
          success: false,
          message: `Archivo demasiado grande. Máximo: ${FileSystemManager.formatFileSize(this.config.maxFileSize)}`
        };
      }

      // Sanitizar nombre del archivo
      const sanitizedName = this.sanitizeFileName(file.name);
      const folderPath = join(this.config.basePath, folderName);
      const filePath = join(folderPath, sanitizedName);

      // Verificar que la carpeta existe
      try {
        const folderStats = await stat(folderPath);
        if (!folderStats.isDirectory()) {
          return { success: false, message: 'La carpeta de destino no existe' };
        }
      } catch {
        return { success: false, message: 'La carpeta de destino no existe' };
      }

      // Verificar si el archivo ya existe
      try {
        await stat(filePath);
        return { success: false, message: 'Ya existe un archivo con ese nombre' };
      } catch {
        // El archivo no existe, podemos continuar
      }

      // Convertir File a Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Escribir archivo
      await writeFile(filePath, buffer);

      // Generar URL
      const relativePath = join(folderName, sanitizedName);
      const url = buildMediaURL(relativePath);

      console.log(`✅ [FileSystem] Archivo subido: ${sanitizedName} a ${folderName}`);
      this.emit('fileUploaded', { folderName, fileName: sanitizedName, relativePath, url });

      return {
        success: true,
        message: 'Archivo subido exitosamente',
        url
      };
    } catch (error) {
      console.error('❌ [FileSystem] Error al subir archivo:', error);
      return { success: false, message: 'Error al subir el archivo' };
    }
  }

  /**
   * Sanitizar nombre de archivo
   */
  private sanitizeFileName(fileName: string): string {
    if (!fileName) return '';

    // Obtener nombre y extensión
    const ext = extname(fileName);
    const name = basename(fileName, ext);

    // Sanitizar nombre (mantener solo caracteres alfanuméricos, guiones y espacios)
    const sanitizedName = name
      .replace(/[^a-zA-Z0-9\s\-_áéíóúñÁÉÍÓÚÑ]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .trim();

    return sanitizedName + ext;
  }

  /**
   * Determinar tipo de media
   */
  private getMediaType(extension: string): 'video' | 'image' | 'other' {
    const videoExts = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.m4v', '.3gp'];
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

    if (videoExts.includes(extension)) return 'video';
    if (imageExts.includes(extension)) return 'image';
    return 'other';
  }

  /**
   * Verificar si un archivo es permitido
   */
  isFileAllowed(filename: string): boolean {
    const ext = extname(filename).toLowerCase();
    return this.config.allowedExtensions.includes(ext);
  }

  /**
   * Formatear tamaño de archivo
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Obtener estadísticas generales
   */
  async getStats(): Promise<{
    totalFolders: number;
    totalFiles: number;
    totalSize: number;
    videoFiles: number;
    imageFiles: number;
  }> {
    try {
      const folders = await this.getFolders();
      let totalFiles = 0;
      let totalSize = 0;
      let videoFiles = 0;
      let imageFiles = 0;

      for (const folder of folders) {
        const files = await this.getFilesInFolder(folder.name);
        totalFiles += files.filter(f => f.type === 'file').length;
        totalSize += files.reduce((sum, file) => sum + file.size, 0);
        videoFiles += files.filter(f => f.mediaType === 'video').length;
        imageFiles += files.filter(f => f.mediaType === 'image').length;
      }

      return {
        totalFolders: folders.length,
        totalFiles,
        totalSize,
        videoFiles,
        imageFiles
      };
    } catch (error) {
      console.error('❌ [FileSystem] Error al obtener estadísticas:', error);
      return {
        totalFolders: 0,
        totalFiles: 0,
        totalSize: 0,
        videoFiles: 0,
        imageFiles: 0
      };
    }
  }
}

// Instancia singleton
let fileSystemInstance: FileSystemManager | null = null;

/**
 * Resetear instancia del gestor de archivos
 */
export function resetFileSystemManager(): void {
  fileSystemInstance = null;
}

/**
 * Obtener instancia del gestor de archivos
 */
export function getFileSystemManager(): FileSystemManager {
  if (!fileSystemInstance) {
    const config: FileSystemConfig = {
      basePath: BASE_PATH, // ✅ Usar configuración dinámica
      serverUrl: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
      allowedExtensions: ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.m4v', '.3gp', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
      maxFileSize: 500 * 1024 * 1024 // 500MB
    };

    fileSystemInstance = new FileSystemManager(config);
  }

  return fileSystemInstance;
}
