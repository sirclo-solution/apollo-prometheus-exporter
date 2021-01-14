import log4js from 'log4js';

log4js.addLayout('customLayout', function () {
  return function (logEvent) {
    return JSON.stringify({
      startTime: logEvent.startTime,
      level: logEvent.level.toString(),
      data: logEvent.data[0]
    });
  };
});

log4js.configure({
  appenders: {
    logFile: {
      type: 'file',
      filename: 'log/all.log',
      layout: { type: 'customLayout' }
    },
    all: {
      type: 'logLevelFilter',
      level: 'INFO',
      appender: 'logFile'
    }
  },
  categories: {
    default: { appenders: ['all'], level: 'trace' }
  }
});
