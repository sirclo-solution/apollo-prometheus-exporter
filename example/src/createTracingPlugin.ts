import OpentracingPlugin, { SpanContext } from 'apollo-opentracing';
import { ApolloServerPlugin } from 'apollo-server-plugin-base';
import { initTracer, PrometheusMetricsFactory } from 'jaeger-client';
import promClient from 'prom-client';

export function createTracingPlugin(): ApolloServerPlugin<SpanContext> {
  const serviceName = 'apollo-example';

  const metrics = new PrometheusMetricsFactory(promClient as any, 'apollo_server');

  const tracer = initTracer(
    {
      serviceName,
      reporter: {
        collectorEndpoint: 'http://agent:14268/api/traces',
        logSpans: true
      },
      sampler: {
        type: 'const',
        param: 1
      }
    },
    {
      tags: {
        [`${serviceName}.version`]: '1.0.0'
      },
      logger: console,
      metrics
    }
  );

  return OpentracingPlugin({
    server: tracer,
    local: tracer,
    onRequestResolve: (span, info) => {
      span.addTags({
        operation: info.operation?.operation,
        operationName: info.operationName
      });
    }
  });
}
