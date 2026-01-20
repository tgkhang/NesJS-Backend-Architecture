import { ConsoleLogger } from '@nestjs/common';

// console logger have alredy implemented all methods from LoggerService
export class MyLoggerDev extends ConsoleLogger {
  log(message: string, context?: string) {
    console.log(`[DEV LOG]${context ? ' [' + context + ']' : ''}: ${message}`);
  }
}
