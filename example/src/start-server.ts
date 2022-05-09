import { ApolloServer } from 'apollo-server-express';
import express from 'express';

import { createPrometheusExporterPlugin } from '../../lib/src';

import { readSchema } from './read-schema';
import { resolvers } from './resolvers';

export function startServer(port: number = 4000, hostname: string = '0.0.0.0') {
  const app = express();

  const typeDefs = readSchema();

  const prometheusExporterPlugin = createPrometheusExporterPlugin({
    app,
    customLabels: ['included', 'test']
  });

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: () => {
      return {
        included: 'value1',
        notIncluded: 'value2',
        test: 'test'
      };
    },
    plugins: [prometheusExporterPlugin]
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
