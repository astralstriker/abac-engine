/**
 * Logger interface for ABAC Engine
 *
 * This interface allows for pluggable logging implementations.
 * Users can provide their own logger (Winston, Pino, Bunyan, etc.)
 * or use the default console-based logger.
 */
export interface ILogger {
  /**
   * Log debug messages
   */
  debug(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log informational messages
   */
  info(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log warning messages
   */
  warn(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log error messages
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void;
}

/**
 * Log levels for filtering
 */
export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  None = 4
}

/**
 * Default console-based logger implementation
 *
 * This logger outputs to console and can be filtered by log level.
 * For production use, consider using a more robust logging library.
 */
export class ConsoleLogger implements ILogger {
  constructor(private readonly minLevel: LogLevel = LogLevel.Info) {}

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.Debug) {
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] ${message}${metaStr}`);
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.Info) {
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}${metaStr}`);
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.Warn) {
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}${metaStr}`);
    }
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.Error) {
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
      const errorStr =
        error instanceof Error ? ` ${error.message}` : error ? ` ${String(error)}` : '';
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}${errorStr}${metaStr}`);

      if (error instanceof Error && error.stack) {
        // eslint-disable-next-line no-console
        console.error(error.stack);
      }
    }
  }
}

/**
 * Silent logger that doesn't output anything
 * Useful for testing or when logging is not desired
 */
export class SilentLogger implements ILogger {
  debug(_message: string, _meta?: Record<string, unknown>): void {
    // Silent
  }

  info(_message: string, _meta?: Record<string, unknown>): void {
    // Silent
  }

  warn(_message: string, _meta?: Record<string, unknown>): void {
    // Silent
  }

  error(_message: string, _error?: Error | unknown, _meta?: Record<string, unknown>): void {
    // Silent
  }
}

/**
 * Create a logger instance based on environment
 *
 * @param level - Minimum log level to output
 * @returns Logger instance
 */
export function createLogger(level: LogLevel = LogLevel.Info): ILogger {
  return new ConsoleLogger(level);
}
