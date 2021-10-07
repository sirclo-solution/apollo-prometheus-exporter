"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlugin = exports.toggleEndpoint = exports.setDefaultLabels = exports.toggleDefaultMetrics = void 0;
const os_1 = require("os");
const prom_client_1 = require("prom-client");
const context_1 = require("./context");
const endpoint_1 = require("./endpoint");
const helpers_1 = require("./helpers");
const hooks_1 = require("./hooks");
const metrics_1 = require("./metrics");
function toggleDefaultMetrics(register, { defaultMetrics, defaultMetricsOptions }) {
    if (defaultMetrics) {
        prom_client_1.collectDefaultMetrics({
            register,
            ...defaultMetricsOptions
        });
    }
}
exports.toggleDefaultMetrics = toggleDefaultMetrics;
function setDefaultLabels(register, { defaultLabels, hostnameLabel, hostnameLabelName }) {
    const labels = helpers_1.filterLabels({
        ...defaultLabels,
        [hostnameLabelName]: hostnameLabel ? os_1.hostname() : undefined
    });
    register.setDefaultLabels(labels);
}
exports.setDefaultLabels = setDefaultLabels;
function toggleEndpoint(register, { metricsEndpoint, app, metricsEndpointPath }) {
    if (metricsEndpoint) {
        endpoint_1.registerEndpoint({
            app: app,
            register,
            path: metricsEndpointPath
        });
    }
}
exports.toggleEndpoint = toggleEndpoint;
function createPlugin(options) {
    const context = context_1.generateContext(options);
    const register = context.register;
    toggleDefaultMetrics(register, context);
    setDefaultLabels(register, context);
    toggleEndpoint(register, context);
    const metrics = metrics_1.generateMetrics(register, context);
    return hooks_1.generateHooks(metrics);
}
exports.createPlugin = createPlugin;
//# sourceMappingURL=plugin.js.map