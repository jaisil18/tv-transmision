export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class Logger {
  private static instance: Logger;
  private level: LogLevel;
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  constructor() {
    this.level = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }
  
  private log(level: LogLevel, message: string, meta?: any) {
    if (level <= this.level) {
      const timestamp = new Date().toISOString();
      const levelName = LogLevel[level];
      console.log(`[${timestamp}] ${levelName}: ${message}`, meta || '');
    }
  }
  
  error(message: string, meta?: any) { this.log(LogLevel.ERROR, message, meta); }
  warn(message: string, meta?: any) { this.log(LogLevel.WARN, message, meta); }
  info(message: string, meta?: any) { this.log(LogLevel.INFO, message, meta); }
  debug(message: string, meta?: any) { this.log(LogLevel.DEBUG, message, meta); }
}

export const logger = Logger.getInstance();