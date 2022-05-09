"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHooks = exports.getLabelsFromFieldResolver = exports.getApolloServerVersion = exports.countFieldAncestors = exports.getCustomLabelsFromAppContext = exports.getLabelsFromContext = void 0;
const package_json_1 = __importDefault(require("apollo-server-express/package.json"));
const helpers_1 = require("./helpers");
const metrics_1 = require("./metrics");
function getLabelsFromContext(context) {
    var _a, _b;
    return {
        operationName: (_a = context === null || context === void 0 ? void 0 : context.request) === null || _a === void 0 ? void 0 : _a.operationName,
        operation: (_b = context === null || context === void 0 ? void 0 : context.operation) === null || _b === void 0 ? void 0 : _b.operation
    };
}
exports.getLabelsFromContext = getLabelsFromContext;
function getCustomLabelsFromAppContext(context, customLabels) {
    if (customLabels.length === 0 || !context) {
        return {};
    }
    // get application's context that correspond with customLabels
    return customLabels.reduce((result, label) => {
        result[label] = context[label];
        return result;
    }, {});
}
exports.getCustomLabelsFromAppContext = getCustomLabelsFromAppContext;
function countFieldAncestors(path) {
    let counter = 0;
    while (path !== undefined) {
        path = path.prev;
        counter++;
    }
    return counter.toString();
}
exports.countFieldAncestors = countFieldAncestors;
function getApolloServerVersion() {
    return package_json_1.default.version ? `v${package_json_1.default.version}` : undefined;
}
exports.getApolloServerVersion = getApolloServerVersion;
function getLabelsFromFieldResolver({ info: { fieldName, parentType, path, returnType } }) {
    return {
        fieldName,
        parentType: parentType.name,
        pathLength: countFieldAncestors(path),
        returnType: returnType.toString()
    };
}
exports.getLabelsFromFieldResolver = getLabelsFromFieldResolver;
function generateHooks(metrics, ctx) {
    const actionMetric = ({ name, labels = {}, value }, context, field) => {
        if (!metrics[name].skip(labels, context, field)) {
            const filteredLabels = (0, helpers_1.filterLabels)(labels);
            switch (metrics[name].type) {
                case metrics_1.MetricTypes.GAUGE:
                    metrics[name].instance.set(filteredLabels, (0, helpers_1.convertMsToS)(value));
                    break;
                case metrics_1.MetricTypes.COUNTER:
                    metrics[name].instance.inc(filteredLabels);
                    break;
                case metrics_1.MetricTypes.HISTOGRAM:
                    metrics[name].instance.observe(filteredLabels, (0, helpers_1.convertMsToS)(value));
                    break;
            }
        }
    };
    return {
        serverWillStart() {
            const version = getApolloServerVersion();
            actionMetric({
                name: metrics_1.MetricsNames.SERVER_STARTING,
                labels: {
                    version
                },
                value: Date.now()
            });
            return {
                serverWillStop() {
                    actionMetric({
                        name: metrics_1.MetricsNames.SERVER_CLOSING,
                        labels: {
                            version
                        },
                        value: Date.now()
                    });
                }
            };
        },
        requestDidStart(requestContext) {
            const requestStartDate = Date.now();
            const customLabelsFromAppContext = getCustomLabelsFromAppContext(requestContext.context, ctx.customLabels);
            actionMetric({
                name: metrics_1.MetricsNames.QUERY_STARTED,
                labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(requestContext) }
            }, requestContext);
            return {
                parsingDidStart(context) {
                    actionMetric({
                        name: metrics_1.MetricsNames.QUERY_PARSE_STARTED,
                        labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
                    }, context);
                    return (err) => {
                        if (err) {
                            actionMetric({
                                name: metrics_1.MetricsNames.QUERY_PARSE_FAILED,
                                labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
                            }, context);
                        }
                    };
                },
                validationDidStart(context) {
                    actionMetric({
                        name: metrics_1.MetricsNames.QUERY_VALIDATION_STARTED,
                        labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
                    }, context);
                    return (err) => {
                        if (err) {
                            actionMetric({
                                name: metrics_1.MetricsNames.QUERY_VALIDATION_FAILED,
                                labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
                            }, context);
                        }
                    };
                },
                didResolveOperation(context) {
                    actionMetric({
                        name: metrics_1.MetricsNames.QUERY_RESOLVED,
                        labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
                    }, context);
                },
                executionDidStart(context) {
                    actionMetric({
                        name: metrics_1.MetricsNames.QUERY_EXECUTION_STARTED,
                        labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
                    }, context);
                    return {
                        willResolveField(field) {
                            const fieldResolveStart = Date.now();
                            return () => {
                                const fieldResolveEnd = Date.now();
                                actionMetric({
                                    name: metrics_1.MetricsNames.QUERY_FIELD_RESOLUTION_DURATION,
                                    labels: {
                                        ...customLabelsFromAppContext,
                                        ...getLabelsFromContext(context),
                                        ...getLabelsFromFieldResolver(field)
                                    },
                                    value: fieldResolveEnd - fieldResolveStart
                                }, context, field);
                            };
                        },
                        executionDidEnd(err) {
                            if (err) {
                                actionMetric({
                                    name: metrics_1.MetricsNames.QUERY_EXECUTION_FAILED,
                                    labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
                                }, context);
                            }
                        }
                    };
                },
                didEncounterErrors(context) {
                    const requestEndDate = Date.now();
                    actionMetric({
                        name: metrics_1.MetricsNames.QUERY_FAILED,
                        labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
                    }, context);
                    actionMetric({
                        name: metrics_1.MetricsNames.QUERY_DURATION,
                        labels: {
                            ...customLabelsFromAppContext,
                            ...getLabelsFromContext(context),
                            success: 'false'
                        },
                        value: requestEndDate - requestStartDate
                    }, context);
                },
                willSendResponse(context) {
                    var _a, _b;
                    const requestEndDate = Date.now();
                    if (((_b = (_a = context.errors) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) === 0) {
                        actionMetric({
                            name: metrics_1.MetricsNames.QUERY_DURATION,
                            labels: {
                                ...customLabelsFromAppContext,
                                ...getLabelsFromContext(context),
                                success: 'true'
                            },
                            value: requestEndDate - requestStartDate
                        }, context);
                    }
                }
            };
        }
    };
}
exports.generateHooks = generateHooks;
//# sourceMappingURL=hooks.js.map