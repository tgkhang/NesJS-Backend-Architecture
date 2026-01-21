// this file is an example of using winston to forward logs to nestjs backend
// run this file to foward log to nestjs backend

import winston from 'winston'
import 'winston-daily-rotate-file'

const logger = winston.createLogger({
  // level: 'debug',
  level: 'info',
  // format: winston.format.json(),
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.label({ label: 'right meow!' }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.simple(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.DailyRotateFile({
      level: 'info',
      dirname: 'log-rotate',
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH-mm',
      maxSize: 10240, // 10MB
    }),
    new winston.transports.Http({
      host: 'localhost',
      port: 3000,
      path: 'user/log',
    }),
  ],
})

logger.info('This is an info message')
logger.error('This is an error message')
logger.debug('This is a debug message')
logger.warn('This is a warn message')
logger.verbose('This is a verbose message')
logger.silly('This is a silly message')

// 6 level of debug
// Level 0 : error
// Level 1 : warn
// Level 2 : info
// Level 3 : http
// Level 4 : verbose
// Level 5 : debug
// Level 6 : silly
// these level can be set in the logger configuration
