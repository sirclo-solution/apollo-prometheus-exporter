import log4js from 'log4js';

import { startServer } from './start-server';

log4js.configure({
  appenders: {
    logFile: {
      type: 'file',
      filename: 'log/all.log'
    },
    all: {
      type: 'logLevelFilter',
      level: 'LOG',
      appender: 'logFile'
    }
  },
  categories: {
    default: { appenders: ['all'], level: 'DEBUG' }
  }
});

const logger = log4js.getLogger('default');
console.info = (message: string, ...args: any) => logger.info(message, ...args);
console.log = (message: string, ...args: any) => logger.log(message, ...args);
console.warn = (message: string, ...args: any) => logger.warn(message, ...args);
console.error = (message: string, ...args: any) => logger.error(message, ...args);

startServer();
