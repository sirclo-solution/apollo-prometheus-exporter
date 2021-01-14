import apolloPackageJson from 'apollo-server-express/package.json';
import { ApolloServerPlugin } from 'apollo-server-plugin-base';
import { GraphQLFieldResolverParams } from 'apollo-server-types';
import { GraphQLObjectType } from 'graphql';
import { Path } from 'graphql/jsutils/Path';
import { Counter, Gauge, Histogram, LabelValues } from 'prom-client';
import { v4 as uuidv4 } from 'uuid';

import { convertMsToS, filterLabels } from './helpers';
import { MetricsNames, Metrics, MetricTypes } from './metrics';

export function getLabelsFromContext(context: any): LabelValues<string> {
  return {
    operationName: context?.request?.operationName,
    operation: context?.operation?.operation
  };
}

export function countFieldAncestors(path: Path | undefined): string {
  let counter = 0;

  while (path !== undefined) {
    path = path.prev;
    counter++;
  }

  return counter.toString();
}

export function getApolloServerVersion(): string | undefined {
  return apolloPackageJson.version ? `v${apolloPackageJson.version}` : undefined;
}

export function getLabelsFromFieldResolver({
  info: { fieldName, parentType, path, returnType }
}: GraphQLFieldResolverParams<any, any>): LabelValues<string> {
  return {
    fieldName,
    parentType: parentType.name,
    pathLength: countFieldAncestors(path),
    returnType: (returnType as GraphQLObjectType)?.name
  };
}

export function generateHooks(metrics: Metrics): ApolloServerPlugin {
  const actionMetric = (name: MetricsNames, labels: LabelValues<string> = {}, value?: number) => {
    if (!metrics[name].disabled) {
      const filteredLabels = filterLabels(labels);

      switch (metrics[name].type) {
        case MetricTypes.GAUGE:
          (metrics[name].instance as Gauge<string>).set(filteredLabels, convertMsToS(value as number));
          break;

        case MetricTypes.COUNTER:
          (metrics[name].instance as Counter<string>).inc(filteredLabels);
          break;

        case MetricTypes.HISTOGRAM:
          (metrics[name].instance as Histogram<string>).observe(filteredLabels, convertMsToS(value as number));
          break;
      }
    }
  };

  return {
    serverWillStart() {
      const version = getApolloServerVersion();

      actionMetric(
        MetricsNames.SERVER_STARTING,
        {
          version
        },
        Date.now()
      );

      return {
        serverWillStop() {
          actionMetric(
            MetricsNames.SERVER_CLOSING,
            {
              version
            },
            Date.now()
          );
        }
      };
    },

    requestDidStart(requestContext) {
      const requestStartDate = Date.now();

      requestContext.context.requestId = uuidv4();

      actionMetric(MetricsNames.QUERY_STARTED, getLabelsFromContext(requestContext));

      return {
        parsingDidStart(context) {
          actionMetric(MetricsNames.QUERY_PARSE_STARTED, getLabelsFromContext(context));

          return (err) => {
            if (err) {
              actionMetric(MetricsNames.QUERY_PARSE_FAILED, getLabelsFromContext(context));
            }
          };
        },

        validationDidStart(context) {
          actionMetric(MetricsNames.QUERY_VALIDATION_STARTED, getLabelsFromContext(context));

          return (err) => {
            if (err) {
              actionMetric(MetricsNames.QUERY_VALIDATION_FAILED, getLabelsFromContext(context));
            }
          };
        },

        didResolveOperation(context) {
          actionMetric(MetricsNames.QUERY_RESOLVED, getLabelsFromContext(context));
        },

        executionDidStart(context) {
          actionMetric(MetricsNames.QUERY_EXECUTION_STARTED, getLabelsFromContext(context));

          return {
            willResolveField(field) {
              const fieldResolveStart = Date.now();

              return () => {
                const fieldResolveEnd = Date.now();

                actionMetric(
                  MetricsNames.QUERY_FIELD_RESOLUTION_DURATION,
                  {
                    ...getLabelsFromContext(context),
                    ...getLabelsFromFieldResolver(field)
                  },
                  fieldResolveEnd - fieldResolveStart
                );
              };
            },
            executionDidEnd(err) {
              if (err) {
                actionMetric(MetricsNames.QUERY_EXECUTION_FAILED, getLabelsFromContext(context));
              }
            }
          };
        },

        didEncounterErrors(context) {
          const requestEndDate = Date.now();

          actionMetric(MetricsNames.QUERY_FAILED, getLabelsFromContext(context));

          context.errors.forEach((error) => {
            context.logger.error(
              JSON.stringify({
                requestId: context.context.requestId,
                spanId: context.context.spanId,
                name: error.name,
                message: error.message,
                stack: error.stack
              })
            );
          });

          actionMetric(
            MetricsNames.QUERY_DURATION,
            {
              ...getLabelsFromContext(context),
              success: 'false'
            },
            requestEndDate - requestStartDate
          );
        },

        willSendResponse(context) {
          const requestEndDate = Date.now();

          const headersEntries = context.request.http?.headers.entries();
          let currentHeader = headersEntries?.next();
          const headers: Record<string, any> = {};

          while (!currentHeader?.done) {
            const key: string = currentHeader?.value[0] as string;
            const value = currentHeader?.value[1];

            headers[key] = value;

            currentHeader = headersEntries?.next();
          }

          context.logger.info(
            JSON.stringify({
              action: 'request',
              requestId: context.context.requestId,
              spanId: context.context.spanId,
              duration: requestEndDate - requestStartDate,
              request: {
                method: context.request.http?.method,
                headers,
                url: context.request.http?.url
              },
              query: {
                operationName: context.request.operationName,
                query: context.request.query,
                variables: context.request.variables
              }
            })
          );

          if ((context.errors?.length ?? 0) === 0) {
            actionMetric(
              MetricsNames.QUERY_DURATION,
              {
                ...getLabelsFromContext(context),
                success: 'true'
              },
              requestEndDate - requestStartDate
            );
          }
        }
      };
    }
  };
}
