import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(3000),
  JWT_SECRET: z.string().min(32),
  BASE_PATH: z.string(),
  MAX_FILE_SIZE: z.string().transform(Number).default(100 * 1024 * 1024), // 100MB
  ALLOWED_EXTENSIONS: z.string().transform(str => str.split(','))
});

export const config = ConfigSchema.parse(process.env);