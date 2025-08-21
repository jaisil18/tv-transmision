import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger';
import { APIError } from './error-handler';

// Crear una capa de acceso a datos centralizada
export class DataAccessLayer {
  private static instance: DataAccessLayer;
  
  static getInstance(): DataAccessLayer {
    if (!DataAccessLayer.instance) {
      DataAccessLayer.instance = new DataAccessLayer();
    }
    return DataAccessLayer.instance;
  }

  async readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
    try {
      logger.debug(`Reading JSON file: ${filePath}`);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      logger.debug(`Successfully read JSON file: ${filePath}`);
      return parsed;
    } catch (error) {
      logger.warn(`Failed to read JSON file ${filePath}, using default value`, error);
      await this.writeJsonFile(filePath, defaultValue);
      return defaultValue;
    }
  }

  async writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    try {
      logger.debug(`Writing JSON file: ${filePath}`);
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      logger.debug(`Successfully wrote JSON file: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to write JSON file: ${filePath}`, error);
      throw new APIError(500, `Error writing file: ${filePath}`);
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      logger.debug(`Ensured directory exists: ${dirPath}`);
    } catch (error) {
      logger.error(`Failed to ensure directory: ${dirPath}`, error);
      throw new APIError(500, `Error creating directory: ${dirPath}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.info(`Deleted file: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to delete file: ${filePath}`, error);
      throw new APIError(500, `Error deleting file: ${filePath}`);
    }
  }
}