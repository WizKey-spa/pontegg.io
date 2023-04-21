// import assetsDefs from './submodules/define-types/lib/dataroom/assets/assets.json';

const env = process.env;
export default () => ({
  PORT: env.PORT ?? 5002,
  LOGLEVEL: env.LOGLEVEL ?? 'debug',

  STORAGE_PROVIDER: env.STORAGE_PROVIDER ?? 'local',
  STORAGE_PATH: env.STORAGE_PATH ?? 'documents',
  LOCAL_STORAGE_PATH: env.LOCAL_STORAGE_PATH ?? '/documents',

  STORAGE_S3_BUCKET: env.STORAGE_S3_BUCKET,

  OAUTH_CLIENT_ID: env.OAUTH_CLIENT_ID,
  OAUTH_SERVER_URL: env.OAUTH_SERVER_URL,
  OAUTH_REALM: env.OAUTH_REALM,
  OAUTH_CLIENT_SECRET: env.OAUTH_CLIENT_SECRET,

  SENTRY_DSN: env.SENTRY_DSN,
  SENTRY_RELEASE_ID: env.SENTRY_RELEASE_ID,
  SENTRY_ENV: env.SENTRY_ENV,

  EMAIL_HOST: env.EMAIL_HOST ?? 'localhost',
  EMAIL_PORT: env.EMAIL_PORT ?? '1025',
  EMAIL_IS_SECURE: env.EMAIL_IS_SECURE ?? false,
  EMAIL_IS_TLS: env.EMAIL_IS_TLS ?? true,
  EMAIL_USER: env.EMAIL_USER,
  EMAIL_PASS: env.EMAIL_PASS,
  EMAIL_SOURCE_ADDRESS: env.EMAIL_SOURCE_ADDRESS ?? 'no-reply@wizkey.com',

  MONGODB_PROTOCOL: env.MONGODB_PROTOCOL,
  MONGODB_USERNAME: env.MONGODB_USERNAME,
  MONGODB_PASSWORD: env.MONGODB_PASSWORD,
  MONGODB_HOST: env.MONGODB_HOST,
  MONGODB_DATABASE: env.MONGODB_DATABASE,
  MONGODB_CA_CERT_PATH: env.MONGODB_CA_CERT_PATH,

  PUBLIC_URL: env.PUBLIC_URL ?? 'http://dev.wizkey.io/data-room/',
  PROMETHEUS_EXPORTER_PORT: env.PROMETHEUS_EXPORTER_PORT ?? 9464,
  PROMETHEUS_START_EXPORTER: env.PROMETHEUS_START_EXPORTER ?? false,
  METRICS_SERVICE_LABEL: env.METRICS_SERVICE_LABEL ?? 'wizkey-node',

  FALLBACK_LANGUAGE: env.FALLBACK_LANGUAGE ?? 'en',

  RESOURCES_DEFS: {},
  SUPPORTED_RESOURCES: env.SUPPORTED_RESOURCES ? env?.SUPPORTED_RESOURCES : 'loan,customer,collateral',

  DEFAULT_GROUP: env.DEFAULT_GROUP ?? 'customer',
  OTHER_GROUPS: env.OTHER_GROUPS ?? ['default-roles-master', 'offline_access', 'uma_authorization'],

  features: {
    QA: env.ENABLE_QA,
  },

  SCHEMES_DIR: env.SCHEMES_DIR ?? '@wizkey/bellerofonte-shared/dist/schemes',
  // polygon testnet
  BLOCKCHAIN_ENDPOINT: env.BLOCKCHAIN_ENDPOINT ?? 'https://matic-mumbai.chainstacklabs.com/', // 'http://localhost:8545', // https://matic-mumbai.chainstacklabs.com/
  BLOCKCHAIN_PRIVATE_KEY:
    env.BLOCKCHAIN_PRIVATE_KEY ?? '0xd9ebab7f8dc2258e2eb92fb04a3f917b27356914d7cf53e08f6acd71407f9753',
  BLOCKCHAIN_BAT_ADDRESS: env.BLOCKCHAIN_BAT_ADDRESS ?? '0xcD663136D6059e80E95A935B28CFba6837f54A64',
  BLOCKCHAIN_VAT_ADDRESS: env.BLOCKCHAIN_VAT_ADDRESS ?? '0x676D6A0abA3F5d059BBa0ddc5856896d3D6bBd54',
  BLOCKCHAIN_GEMJOIN_ADDRESS: env.BLOCKCHAIN_GEMJOIN_ADDRESS ?? '0x00909e2501E95aeF5E8a029CB6b8F370fCC693BD',
});