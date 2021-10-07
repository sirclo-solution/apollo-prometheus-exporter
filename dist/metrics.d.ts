import { Metric, Registry } from 'prom-client';
import { Context } from './context';
export declare enum MetricsNames {
    SERVER_STARTING = "apollo_server_starting",
    SERVER_CLOSING = "apollo_server_closing",
    QUERY_STARTED = "apollo_query_started",
    QUERY_FAILED = "apollo_query_failed",
    QUERY_PARSE_STARTED = "apollo_query_parse_started",
    QUERY_PARSE_FAILED = "apollo_query_parse_failed",
    QUERY_VALIDATION_STARTED = "apollo_query_validation_started",
    QUERY_VALIDATION_FAILED = "apollo_query_validation_failed",
    QUERY_RESOLVED = "apollo_query_resolved",
    QUERY_EXECUTION_STARTED = "apollo_query_execution_started",
    QUERY_EXECUTION_FAILED = "apollo_query_execution_failed",
    QUERY_DURATION = "apollo_query_duration",
    QUERY_FIELD_RESOLUTION_DURATION = "apollo_query_field_resolution_duration"
}
export declare enum MetricTypes {
    GAUGE = 0,
    COUNTER = 1,
    HISTOGRAM = 2
}
export interface MetricConfig {
    name: MetricsNames;
    help: string;
    type: MetricTypes;
    labelNames?: string[];
    buckets?: number[];
}
export declare const serverLabelNames: string[];
export declare const queryLabelNames: string[];
export declare const fieldLabelNames: string[];
export declare const durationHistogramsBuckets: number[];
export declare const metricsConfig: MetricConfig[];
export declare type Metrics = {
    [metricName in MetricsNames]: {
        type: MetricTypes;
        disabled: boolean;
        instance: Metric<string> | null;
    };
};
export declare function generateMetrics(register: Registry, { disabledMetrics }: Context): Metrics;
