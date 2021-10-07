import { Express } from 'express';
import { DefaultMetricsCollectorConfiguration, LabelValues, Registry } from 'prom-client';
import { MetricsNames } from './metrics';
export interface Context {
    app: Express;
    defaultLabels: LabelValues<string>;
    defaultMetrics: boolean;
    defaultMetricsOptions: DefaultMetricsCollectorConfiguration;
    disabledMetrics: MetricsNames[];
    hostnameLabel: boolean;
    hostnameLabelName: string;
    metricsEndpoint: boolean;
    metricsEndpointPath: string;
    register: Registry;
}
export declare function generateContext(options: Partial<Context>): Context;
