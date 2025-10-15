/**
 * Logger Module
 *
 * Provides a pluggable logging interface for the ABAC Engine.
 * Users can inject their own logger implementation or use the default console logger.
 */

export { ConsoleLogger, createLogger, ILogger, LogLevel, SilentLogger } from './logger';

