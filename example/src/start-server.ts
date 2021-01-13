import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import OpentracingPlugin from 'apollo-opentracing';
import { initTracer } from 'jaeger-client';

import { createPrometheusExporterPlugin } from '../../lib/src';

import { readSchema } from './read-schema';
import { resolvers } from './resolvers';

export function startServer(port: number = 4000, hostname: string = '0.0.0.0') {
  const app = express();

  const typeDefs = readSchema();

  const prometheusExporterPlugin = createPrometheusExporterPlugin({
    app
  });

  const serverTracer = initTracer(
    {
      serviceName: 'apollo-example',
      reporter: {
        agentHost: 'agent'
      }
    },
    {}
  );

  const localTracer = initTracer(
    {
      serviceName: 'apollo-example',
      reporter: {
        agentHost: 'agent'
      }
    },
    {}
  );

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
      prometheusExporterPlugin,
      OpentracingPlugin({
        server: serverTracer,
        local: localTracer
      })
    ]
  });

  server.applyMiddleware({ app, path: '/' });

  try {
    app.listen(port, hostname, () => {
      console.log(`🚀 App listening at http://${hostname}:${port}`);
    });
  } catch (error) {
    console.error('💥 Failed to start app!', error);
  }
}
