import conf from '../src/config';
import { testPublicKey, oauthRealm, oauthServerUrl, oauthClientId, oauthClientSecret, defaultGroup } from './testdata';

export default Object.assign(conf, {
  OAUTH_CLIENT_ID: oauthClientId,
  OAUTH_CLIENT_SECRET: oauthClientSecret,
  OAUTH_REALM_PUBLIC_KEY: testPublicKey,
  OAUTH_REALM: oauthRealm,
  OAUTH_SERVER_URL: oauthServerUrl,

  STORAGE_PATH: '/tmp/storage',

  PROMETHEUS_START_EXPORTER: false,
  SUPPORTED_RESOURCES: 'loan,customer,collateral',

  DEFAULT_GROUP: defaultGroup,
  OTHER_GROUPS: ['default-roles-master', 'offline_access', 'uma_authorization'],

  SCHEMES_DIR: '@wizkey/bellerofonte-shared/dist/schemes',

  INSURANCE_PERCENTAGE: 70,
  INSURANCE_FEE_PERCENTAGE: 0.5,

  FINANCED_ON_TOP_PERCENTAGE: 0,
  EXCHANGE_FEE_PERCENTAGE: 0.1,
  STABILITY_FEE_PERCENTAGE: 0.3,
  PLATFORM_FEE_PERCENTAGE: 0.6,
  SSD_COST: 0.5,
  API_CALL_COST: 1,
  API_CALLS_PER_INVOICE: 4,
  PROPOSAL_WAIT_DAYS: 2,
  GRACE_PERIOD_DAYS: 5,

  MARKETPLACE_AUTH_URL: 'https://auth.dev.wizkey.io/v1',
  MARKETPLACE_CLIENT_ID: 'dataroom-bellerofonte1',
  MARKETPLACE_DATAROOM_URL: 'https://bellerofonte1.datarooms.dev.wizkey.io/v1',
  MARKETPLACE_ADMIN_USER: 'admin@bellerofonte.com',
  MARKETPLACE_ADMIN_PASSWORD: 'pass',

  OPEN_API_URL: 'https://test.imprese.openapi.it',
  OPEN_API_AUTH_URL: 'https://test.oauth.openapi.it',
  OPEN_API_BASIC_TOKEN: '80b27611cf262f452b2d039b7fce5313',

  BLOCKCHAIN_ENDPOINT: 'http://localhost:8545',
  BLOCKCHAIN_PRIVATE_KEY: '0xbc2eeffaae546d9281028e5b642fd38176332962568ac97a9328666fd202da5b',
  BLOCKCHAIN_BAT_ADDRESS: '0x9e1D5eEe3cFa123cFd428A5438A2F5aa658A6FEA',
});
