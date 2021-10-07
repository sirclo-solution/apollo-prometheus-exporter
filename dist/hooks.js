"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHooks = exports.getLabelsFromFieldResolver = exports.getApolloServerVersion = exports.countFieldAncestors = exports.getLabelsFromContext = void 0;
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
    var _a;
    return {
        fieldName,
        parentType: parentType.name,
        pathLength: countFieldAncestors(path),
        returnType: (_a = returnType) === null || _a === void 0 ? void 0 : _a.name
    };
}
exports.getLabelsFromFieldResolver = getLabelsFromFieldResolver;
function generateHooks(metrics) {
    const actionMetric = (name, labels = {}, value) => {
        if (!metrics[name].disabled) {
            const filteredLabels = helpers_1.filterLabels(labels);
            switch (metrics[name].type) {
                case metrics_1.MetricTypes.GAUGE:
                    metrics[name].instance.set(filteredLabels, helpers_1.convertMsToS(value));
                    break;
                case metrics_1.MetricTypes.COUNTER:
                    metrics[name].instance.inc(filteredLabels);
                    break;
                case metrics_1.MetricTypes.HISTOGRAM:
                    metrics[name].instance.observe(filteredLabels, helpers_1.convertMsToS(value));
                    break;
            }
        }
    };
    return {
        serverWillStart() {
            const version = getApolloServerVersion();
            actionMetric(metrics_1.MetricsNames.SERVER_STARTING, {
                version
            }, Date.now());
            return {
                serverWillStop() {
                    actionMetric(metrics_1.MetricsNames.SERVER_CLOSING, {
                        version
                    }, Date.now());
                }
            };
        },
        requestDidStart(requestContext) {
            const requestStartDate = Date.now();
            actionMetric(metrics_1.MetricsNames.QUERY_STARTED, getLabelsFromContext(requestContext));
            return {
                parsingDidStart(context) {
                    actionMetric(metrics_1.MetricsNames.QUERY_PARSE_STARTED, getLabelsFromContext(context));
                    return (err) => {
                        if (err) {
                            actionMetric(metrics_1.MetricsNames.QUERY_PARSE_FAILED, getLabelsFromContext(context));
                        }
                    };
                },
                validationDidStart(context) {
                    actionMetric(metrics_1.MetricsNames.QUERY_VALIDATION_STARTED, getLabelsFromContext(context));
                    return (err) => {
                        if (err) {
                            actionMetric(metrics_1.MetricsNames.QUERY_VALIDATION_FAILED, getLabelsFromContext(context));
                        }
                    };
                },
                didResolveOperation(context) {
                    actionMetric(metrics_1.MetricsNames.QUERY_RESOLVED, getLabelsFromContext(context));
                },
                executionDidStart(context) {
                    actionMetric(metrics_1.MetricsNames.QUERY_EXECUTION_STARTED, getLabelsFromContext(context));
                    return {
                        willResolveField(field) {
                            const fieldResolveStart = Date.now();
                            return () => {
                                const fieldResolveEnd = Date.now();
                                actionMetric(metrics_1.MetricsNames.QUERY_FIELD_RESOLUTION_DURATION, {
                                    ...getLabelsFromContext(context),
                                    ...getLabelsFromFieldResolver(field)
                                }, fieldResolveEnd - fieldResolveStart);
                            };
                        },
                        executionDidEnd(err) {
                            if (err) {
                                actionMetric(metrics_1.MetricsNames.QUERY_EXECUTION_FAILED, getLabelsFromContext(context));
                            }
                        }
                    };
                },
                didEncounterErrors(context) {
                    const requestEndDate = Date.now();
                    actionMetric(metrics_1.MetricsNames.QUERY_FAILED, getLabelsFromContext(context));
                    actionMetric(metrics_1.MetricsNames.QUERY_DURATION, {
                        ...getLabelsFromContext(context),
                        success: 'false'
                    }, requestEndDate - requestStartDate);
                },
                willSendResponse(context) {
                    var _a, _b;
                    const requestEndDate = Date.now();
                    if (((_b = (_a = context.errors) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) === 0) {
                        actionMetric(metrics_1.MetricsNames.QUERY_DURATION, {
                            ...getLabelsFromContext(context),
                            success: 'true'
                        }, requestEndDate - requestStartDate);
                    }
                }
            };
        }
    };
}
exports.generateHooks = generateHooks;
//# sourceMappingURL=hooks.js.map