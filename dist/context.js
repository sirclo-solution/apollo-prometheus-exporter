"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateContext = void 0;
const prom_client_1 = require("prom-client");
function generateContext(options) {
    var _a;
    const context = {
        app: options.app,
        defaultLabels: {},
        defaultMetrics: true,
        disabledMetrics: [],
        hostnameLabel: true,
        hostnameLabelName: 'hostname',
        metricsEndpoint: true,
        metricsEndpointPath: '/metrics',
        register: prom_client_1.register,
        ...options,
        defaultMetricsOptions: {
            register: prom_client_1.register,
            ...((_a = options.defaultMetricsOptions) !== null && _a !== void 0 ? _a : {})
        }
    };
    if (context.metricsEndpoint) {
        if (!context.app) {
            throw new Error('app option is not defined. Disable metricsEndpoint or pass app');
        }
        if (!context.metricsEndpointPath) {
            throw new Error('Malformed metricsEndpointPath option');
        }
    }
    if (context.hostnameLabel) {
        if (!context.hostnameLabelName) {
            throw new Error('Malformed hostnameLabelName option');
        }
        if (Object.keys(context.defaultLabels).includes(context.hostnameLabelName)) {
            throw new Error('hostnameLabelName option is already defined in defaultLabels');
        }
    }
    return context;
}
exports.generateContext = generateContext;
//# sourceMappingURL=context.js.map