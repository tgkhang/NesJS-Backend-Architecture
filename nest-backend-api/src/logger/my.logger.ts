import { LoggerService, LogLevel } from '@nestjs/common';

export class MyLogger implements LoggerService {
  log(message: string, context?: string) {
    console.log(`[LOG]${context ? ' [' + context + ']' : ''}: ${message}`);
  }
  error(message: string, context?: string) {
    console.log(`[LOG]${context ? ' [' + context + ']' : ''}: ${message}`);
  }
  warn(message: string, context?: string) {
    console.log(`[LOG]${context ? ' [' + context + ']' : ''}: ${message}`);
  }
  debug?(message: string, context?: string) {
    console.log(`[LOG]${context ? ' [' + context + ']' : ''}: ${message}`);
  }
  verbose?(message: string, context?: string) {
    console.log(`[LOG]${context ? ' [' + context + ']' : ''}: ${message}`);
  }
  fatal?(message: string, context?: string) {
    console.log(`[LOG]${context ? ' [' + context + ']' : ''}: ${message}`);
  }
  setLogLevels?(levels: LogLevel[]) {
    // No implementation needed for this example
  }
}
