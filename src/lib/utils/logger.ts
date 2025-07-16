type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  userRole?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: this.formatTimestamp(),
      context,
      error,
      userId: this.getUserId(),
      userRole: this.getUserRole(),
    };
  }

  private getUserId(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    // Get from auth context or localStorage
    return localStorage.getItem('userId') || undefined;
  }

  private getUserRole(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    // Get from auth context or localStorage
    return localStorage.getItem('userRole') || undefined;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    if (level === 'debug' && !this.isDebugMode) return false;
    return level === 'error' || level === 'warn';
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const { level, message, timestamp, context, error } = entry;
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

    switch (level) {
      case 'debug':
        console.debug(logMessage, context, error);
        break;
      case 'info':
        console.info(logMessage, context, error);
        break;
      case 'warn':
        console.warn(logMessage, context, error);
        break;
      case 'error':
        console.error(logMessage, context, error);
        this.reportError(entry);
        break;
    }

    // Store logs in production for later analysis
    if (!this.isDevelopment) {
      this.storeLog(entry);
    }
  }

  private reportError(entry: LogEntry): void {
    // In production, send to error monitoring service
    if (!this.isDevelopment && entry.error) {
      // TODO: Integrate with Sentry, LogRocket, or similar
      console.error('Error reported:', entry);
    }
  }

  private storeLog(entry: LogEntry): void {
    // Store in localStorage or send to logging service
    try {
      const logs = JSON.parse(localStorage.getItem('appLogs') || '[]');
      logs.push(entry);
      
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.shift();
      }
      
      localStorage.setItem('appLogs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store log:', error);
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(this.createLogEntry('debug', message, context));
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(this.createLogEntry('info', message, context));
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(this.createLogEntry('warn', message, context));
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(this.createLogEntry('error', message, context, error));
  }

  // Business logic logging
  userAction(action: string, details?: Record<string, any>): void {
    this.info(`User Action: ${action}`, details);
  }

  databaseOperation(operation: string, collection: string, details?: Record<string, any>): void {
    this.debug(`Database: ${operation} on ${collection}`, details);
  }

  authEvent(event: string, details?: Record<string, any>): void {
    this.info(`Auth: ${event}`, details);
  }

  performanceLog(metric: string, value: number, context?: Record<string, any>): void {
    this.debug(`Performance: ${metric} = ${value}ms`, context);
  }

  // Get stored logs for debugging
  getLogs(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem('appLogs') || '[]');
    } catch {
      return [];
    }
  }

  // Clear stored logs
  clearLogs(): void {
    localStorage.removeItem('appLogs');
  }
}

export const logger = new Logger();

// Error boundary utility
export const withErrorLogging = <T extends (...args: any[]) => any>(
  fn: T,
  functionName: string
): T => {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error: Error) => {
          logger.error(`Error in ${functionName}`, error, { args });
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      logger.error(`Error in ${functionName}`, error as Error, { args });
      throw error;
    }
  }) as T;
}; 