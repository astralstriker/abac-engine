/**
 * Logger Tests
 *
 * Tests for the logger interface and implementations
 */

import {
    ConsoleLogger,
    createLogger,
    ILogger,
    LogLevel,
    SilentLogger
} from '../../src/logger';

describe('Logger', () => {
  describe('SilentLogger', () => {
    it('should not throw errors when logging', () => {
      const logger = new SilentLogger();

      expect(() => logger.debug('test message')).not.toThrow();
      expect(() => logger.info('test message')).not.toThrow();
      expect(() => logger.warn('test message')).not.toThrow();
      expect(() => logger.error('test message')).not.toThrow();
    });

    it('should accept metadata without errors', () => {
      const logger = new SilentLogger();
      const meta = { key: 'value', number: 123 };

      expect(() => logger.debug('test', meta)).not.toThrow();
      expect(() => logger.info('test', meta)).not.toThrow();
      expect(() => logger.warn('test', meta)).not.toThrow();
      expect(() => logger.error('test', new Error('test error'), meta)).not.toThrow();
    });
  });

  describe('ConsoleLogger', () => {
    let consoleDebugSpy: jest.SpyInstance;
    let consoleInfoSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleDebugSpy.mockRestore();
      consoleInfoSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should log debug messages when level is Debug', () => {
      const logger = new ConsoleLogger(LogLevel.Debug);
      logger.debug('debug message');

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] debug message');
    });

    it('should log info messages when level is Info or lower', () => {
      const logger = new ConsoleLogger(LogLevel.Info);
      logger.info('info message');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] info message');
    });

    it('should log warn messages when level is Warn or lower', () => {
      const logger = new ConsoleLogger(LogLevel.Warn);
      logger.warn('warn message');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warn message');
    });

    it('should log error messages when level is Error or lower', () => {
      const logger = new ConsoleLogger(LogLevel.Error);
      logger.error('error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message');
    });

    it('should not log debug when level is Info', () => {
      const logger = new ConsoleLogger(LogLevel.Info);
      logger.debug('debug message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should not log info when level is Warn', () => {
      const logger = new ConsoleLogger(LogLevel.Warn);
      logger.info('info message');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should not log anything when level is None', () => {
      const logger = new ConsoleLogger(LogLevel.None);
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should include metadata in log messages', () => {
      const logger = new ConsoleLogger(LogLevel.Debug);
      const meta = { userId: '123', action: 'test' };

      logger.debug('test message', meta);

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        `[DEBUG] test message ${JSON.stringify(meta)}`
      );
    });

    it('should log error objects with stack trace', () => {
      const logger = new ConsoleLogger(LogLevel.Error);
      const error = new Error('test error');

      logger.error('error occurred', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] error occurred')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('test error'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error: test error'));
    });

    it('should handle non-Error objects in error method', () => {
      const logger = new ConsoleLogger(LogLevel.Error);

      logger.error('error occurred', 'string error');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] error occurred string error')
      );
    });

    it('should default to Info level', () => {
      const logger = new ConsoleLogger();

      logger.debug('debug'); // Should not log
      logger.info('info'); // Should log

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });

  describe('createLogger', () => {
    it('should create a ConsoleLogger by default', () => {
      const logger = createLogger();
      expect(logger).toBeInstanceOf(ConsoleLogger);
    });

    it('should create a logger with specified level', () => {
      const logger = createLogger(LogLevel.Debug);
      expect(logger).toBeInstanceOf(ConsoleLogger);
    });
  });

  describe('Custom Logger Implementation', () => {
    it('should support custom logger implementations', () => {
      const logs: string[] = [];

      class CustomLogger implements ILogger {
        debug(message: string): void {
          logs.push(`DEBUG: ${message}`);
        }

        info(message: string): void {
          logs.push(`INFO: ${message}`);
        }

        warn(message: string): void {
          logs.push(`WARN: ${message}`);
        }

        error(message: string, error?: Error | unknown): void {
          const errorStr = error instanceof Error ? error.message : String(error);
          logs.push(`ERROR: ${message} - ${errorStr}`);
        }
      }

      const logger = new CustomLogger();

      logger.debug('debug test');
      logger.info('info test');
      logger.warn('warn test');
      logger.error('error test', new Error('test error'));

      expect(logs).toEqual([
        'DEBUG: debug test',
        'INFO: info test',
        'WARN: warn test',
        'ERROR: error test - test error'
      ]);
    });
  });
});
