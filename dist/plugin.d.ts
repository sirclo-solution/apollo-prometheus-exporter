import { ApolloServerPlugin } from 'apollo-server-plugin-base';
import { Registry } from 'prom-client';
import { Context } from './context';
export declare function toggleDefaultMetrics(register: Registry, { defaultMetrics, defaultMetricsOptions }: Context): void;
export declare function setDefaultLabels(register: Registry, { defaultLabels, hostnameLabel, hostnameLabelName }: Context): void;
export declare function toggleEndpoint(register: Registry, { metricsEndpoint, app, metricsEndpointPath }: Context): void;
export declare type PluginOptions = Partial<Context>;
export declare function createPlugin(options: PluginOptions): ApolloServerPlugin;
