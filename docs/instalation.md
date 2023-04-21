# Installation

```bash
$ pnpm install
```

## Running the pontegg.io

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
