import apolloPackageJson from 'apollo-server-express/package.json';
import { ApolloServerPlugin } from 'apollo-server-plugin-base';
import { BaseContext, GraphQLFieldResolverParams } from 'apollo-server-types';
import { Path } from 'graphql/jsutils/Path';
import { Counter, Gauge, Histogram, LabelValues } from 'prom-client';
import { AppContext, Args, Context, Source } from './context';

import { convertMsToS, filterLabels } from './helpers';
import { ContextTypes, FieldTypes, MetricsNames, Metrics, MetricTypes } from './metrics';

export function getLabelsFromContext(context: any): LabelValues<string> {
  return {
    operationName: context?.request?.operationName,
    operation: context?.operation?.operation
  };
}

export function getCustomLabelsFromAppContext(context: BaseContext, customLabels: string[]): LabelValues<string> {
  if (customLabels.length === 0 || !context) {
    return {};
  }

  // get application's context that correspond with customLabels
  return customLabels.reduce((result, label) => {
    result[label] = context[label];
    return result;
  }, {} as LabelValues<string>);
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
    returnType: returnType.toString()
  };
}

export function generateHooks<C = AppContext, S = Source, A = Args>(
  metrics: Metrics,
  ctx: Context<C, S, A>
): ApolloServerPlugin {
  const actionMetric = (
    {
      name,
      labels = {},
      value
    }: {
      name: MetricsNames;
      labels: LabelValues<string>;
      value?: number;
    },
    context?: ContextTypes,
    field?: FieldTypes
  ) => {
    if (!metrics[name].skip(labels, context!, field!)) {
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

      actionMetric({
        name: MetricsNames.SERVER_STARTING,
        labels: {
          version
        },
        value: Date.now()
      });

      return {
        serverWillStop() {
          actionMetric({
            name: MetricsNames.SERVER_CLOSING,
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

      actionMetric(
        {
          name: MetricsNames.QUERY_STARTED,
          labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(requestContext) }
        },
        requestContext
      );

      return {
        parsingDidStart(context) {
          actionMetric(
            {
              name: MetricsNames.QUERY_PARSE_STARTED,
              labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
            },
            context
          );

          return (err) => {
            if (err) {
              actionMetric(
                {
                  name: MetricsNames.QUERY_PARSE_FAILED,
                  labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
                },
                context
              );
            }
          };
        },

        validationDidStart(context) {
          actionMetric(
            {
              name: MetricsNames.QUERY_VALIDATION_STARTED,
              labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
            },
            context
          );

          return (err) => {
            if (err) {
              actionMetric(
                {
                  name: MetricsNames.QUERY_VALIDATION_FAILED,
                  labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
                },
                context
              );
            }
          };
        },

        didResolveOperation(context) {
          actionMetric(
            {
              name: MetricsNames.QUERY_RESOLVED,
              labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
            },
            context
          );
        },

        executionDidStart(context) {
          actionMetric(
            {
              name: MetricsNames.QUERY_EXECUTION_STARTED,
              labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
            },
            context
          );

          return {
            willResolveField(field) {
              const fieldResolveStart = Date.now();

              return () => {
                const fieldResolveEnd = Date.now();

                actionMetric(
                  {
                    name: MetricsNames.QUERY_FIELD_RESOLUTION_DURATION,
                    labels: {
                      ...customLabelsFromAppContext,
                      ...getLabelsFromContext(context),
                      ...getLabelsFromFieldResolver(field)
                    },
                    value: fieldResolveEnd - fieldResolveStart
                  },
                  context,
                  field
                );
              };
            },
            executionDidEnd(err) {
              if (err) {
                actionMetric(
                  {
                    name: MetricsNames.QUERY_EXECUTION_FAILED,
                    labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
                  },
                  context
                );
              }
            }
          };
        },

        didEncounterErrors(context) {
          const requestEndDate = Date.now();

          actionMetric(
            {
              name: MetricsNames.QUERY_FAILED,
              labels: { ...customLabelsFromAppContext, ...getLabelsFromContext(context) }
            },
            context
          );

          actionMetric(
            {
              name: MetricsNames.QUERY_DURATION,
              labels: {
                ...customLabelsFromAppContext,
                ...getLabelsFromContext(context),
                success: 'false'
              },
              value: requestEndDate - requestStartDate
            },
            context
          );
        },

        willSendResponse(context) {
          const requestEndDate = Date.now();

          if ((context.errors?.length ?? 0) === 0) {
            actionMetric(
              {
                name: MetricsNames.QUERY_DURATION,
                labels: {
                  ...customLabelsFromAppContext,
                  ...getLabelsFromContext(context),
                  success: 'true'
                },
                value: requestEndDate - requestStartDate
              },
              context
            );
          }
        }
      };
    }
  };
}
