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
