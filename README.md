## Description 

WizKey Bellerofonte server. This repo contains the server app for the Bellerofonte project. It is based on NestJs v9 and Node v18.

## Installation

```bash
$ pnpm install
```

## Running the app

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Test

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Configuration

The service is configured via environment variables.

- PORT: the http port api will be exposed to, defaults to 5002

- LOGLEVEL: the default pino log level, defaults to `debug`

- MONGODB_PROTOCOL
- MONGODB_USERNAME
- MONGODB_PASSWORD
- MONGODB_HOST
- MONGODB_DATABASE
- MONGODB_CA_CERT_PATH

- STORAGE_PROVIDER: allows to choose a storage adapter.
  Available values are `local` and `S3`
  Defaults to `local`.

- STORAGE_PATH: storage base path

- STORAGE_S3_BUCKET: S3 bucket name

- EMAIL_HOST: defaults to 'localhost'
- EMAIL_PORT: defaults to '1025'
- EMAIL_IS_SECURE: defaults to false
- EMAIL_IS_TLS: defaults to true
- EMAIL_ADDRESS
- EMAIL_PASS

- OAUTH_CLIENT_ID: The assigned oauth client id
- OAUTH_SERVER_URL: Url to keycloak endpoint
- OAUTH_REALM: The assigned oauth realm
- OAUTH_CLIENT_SECRET: The assigned oauth client secret

- AUTHZ_SERVER_URL: Url to the `auth` backend

- PUBLIC_URL: The url apis will be exposed to

- PROMETHEUS_EXPORTER_PORT: env.PROMETHEUS_EXPORTER_PORT defaults to 9464,
- PROMETHEUS_START_EXPORTER: Enables prometheus export on the port specified with `PROMETHEUS_EXPORTER_PORT`

- METRICS_SERVICE_LABEL: Value to assign to the `service` http metric label

- FALLBACK_LANGUAGE: defaults to `en`

- SUPPORTED_ASSETS: comma delimited string. defaults to `['credit']`

- ALLOW_NON_TOKENIZED_ASSETS: defaults to `false`

## Components

This section will describe some of the components used for this project.

### Logger

The logger used for Dataroom project is [Pino](https://github.com/pinojs/pino), in particular in its NestJS flavour [`nestjs-pino`](https://github.com/iamolegga/nestjs-pino). The logger is not used as "vanilla", instead has been customized for redaction, tracing purposes, to exclude some paths and to adapt its behavior when executed in specified environments. Under `src/logger` all the logger configuration can be found. The `logger.ts` file contains the basic configurations of Pino Logger, here happens the OpenTelemetry components injection. The `logger.module.ts` file contains all the module settings as well as the redaction component ([`pino-noir`](https://github.com/pinojs/pino-noir)).

### Tracing and Metrics

Tracing and metrics for the dataroom are provided by [OpenTelemetry](https://github.com/open-telemetry/opentelemetry-js), specifically the NestJS version [`nestjs-otel`](https://github.com/pragmaticivan/nestjs-otel). The tracing module is configured in the `src/tracing/tracing.ts` file where the JaegerExporter (used to send traces to Tempo collector) is instantiated and also the [propagators](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/context/api-propagators.md), the Node automatic instrumentations and the resource name (identifies which service generated the trace in Tempo).

The metrics are configured in the `src/metrics` folder. The `metrics.service.ts` file configures the service for the metrics along with the exporter (Prometheus) instantiation. The `metrics.module.ts` file defines the module to be passed to the app. The `metrics.middleware.ts` file implements the NestJS middleware in order to be able to catch all the requests received by the app. In this file are also defined the metrics that should be counted to be aggregated and sent to prometheus. At the moment the two metrics recorded are the times a specific URL is called and the app response latency.
