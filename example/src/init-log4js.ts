import log4js from 'log4js';

log4js.configure({
  appenders: {
    logFile: {
      type: 'file',
      filename: 'log/all.log'
    },
    all: {
      type: 'logLevelFilter',
      level: 'INFO',
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