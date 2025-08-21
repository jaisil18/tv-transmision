import { z } from 'zod';
import { ValidationError } from './error-handler';

// Esquemas base
export const ScreenSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es muy largo'),
  status: z.enum(['active', 'inactive']).optional(),
  muted: z.boolean().optional(),
  lastSeen: z.number().optional(),
  location: z.string().optional(),
  description: z.string().optional()
});

export const PlaylistItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'El nombre del item es requerido'),
  url: z.string().url('URL inválida'),
  type: z.enum(['image', 'video'], { errorMap: () => ({ message: 'Tipo debe ser image o video' }) }),
  duration: z.number().positive('La duración debe ser positiva').optional(),
  order: z.number().int().min(0).optional()
});

export const PlaylistSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es muy largo'),
  items: z.array(PlaylistItemSchema).optional(),
  screens: z.array(z.string()).optional(),
  folder: z.string().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional()
});

export const FileUploadSchema = z.object({
  name: z.string().min(1, 'El nombre del archivo es requerido'),
  type: z.string().min(1, 'El tipo de archivo es requerido'),
  size: z.number().positive('El tamaño debe ser positivo'),
  folder: z.string().optional()
});

export const SettingsSchema = z.object({
  autoRefreshInterval: z.number().int().min(1000, 'Intervalo mínimo: 1 segundo'),
  maxFileSize: z.number().int().positive('Tamaño máximo debe ser positivo'),
  allowedFileTypes: z.array(z.string()),
  defaultPlaylistDuration: z.number().int().positive(),
  enableLogging: z.boolean(),
  logLevel: z.enum(['error', 'warn', 'info', 'debug'])
});

// Función de validación mejorada
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorDetails = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
    
    throw new ValidationError('Datos de entrada inválidos', errorDetails);
  }
  return result.data;
}

// Validaciones específicas
export function validateScreenId(id: string): string {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new ValidationError('ID de pantalla inválido');
  }
  return id.trim();
}

export function validatePlaylistId(id: string): string {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new ValidationError('ID de playlist inválido');
  }
  return id.trim();
}

export function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = filename.toLowerCase().split('.').pop();
  return ext ? allowedExtensions.includes(ext) : false;
}