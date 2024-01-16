import { readFileSync } from 'fs';
import { resolve } from 'path';
import { sign } from 'jsonwebtoken';
import { createHash } from 'crypto';

import { Notarization } from '../src/common.dto';
import { hash } from '../src/lib/hash';

export const fakeAxiosError = Object.assign(new Error(), { response: { status: 400 } });

export const document = {
  name: 'string',
  description: 'string',
  tags: 'string',
  /*   isMainDocument: false, */
};

export const notarize = {
  transactionId: `0x3bba3db96f33a3d31cfb354f91e2d431a0fa11190b7882ed17687a4ef22073f7`,
  digest: `0x3bba3db96f33a3d31cfb354f91e2d431a0fa11190b7882ed17687a4ef22073f8`,
  notarizedPayload: '{}',
  notarizedAt: new Date(),
};

export const notarizedDocument = {
  name: 'string',
  description: 'string',
  tags: 'string',
  /*   isMainDocument: false, */
  notarization: {
    transactionId: '0x3bba3db96f33a3d31cfb354f91e2d431a0fa11190b7882ed17687a4ef22073f7',
    notarizedPayload:
      '{"id":"a70a03500d92e09500a2b395","notarizedAt":"2020-02-04T10:58:21.506Z","digest":"0x41d53cec30defda03d6e14662060e421117747d8ab7630b8c1a2e8b48b6ea094"}',
    digest: '0x8b82286993574399724db83293f14a354b962919cd9193a32a7f323041533fd6',
    notarizedAt: '2020-02-04T10:58:21.506Z',
  },
};

export const notarization = {
  digest: 'string',
  notarizedPayload: '123',
  notarizedAt: new Date('2012-12-12'),
};

export const oauthClientId = 'dr1';
export const oauthClientSecret = 'secret';
export const oauthRealm = 'testrealm';
export const oauthServerUrl = 'http://testserver';
export const authzServerUrl = 'http://testauthzserver';

export const sampleRefreshToken = readFileSync(resolve(__dirname, './sample_refresh_token')).toString();

export const buyerSub = 'eb596f9b-1d6c-4b82-8b28-19b2da873123';
export const adminSub = 'eb596f9b-1d6c-4b82-8b28-19b2da873202';
export const defaultOrganizationId = 'test_bank';
export const defaultGroup = 'customer';
export const otherGroups = ['default-roles-master', 'offline_access', 'uma_authorization'];

export const sampleToken = (group?: string, sub?: string) => ({
  jti: 'c38ff617-023d-463b-b8e3-c777e31e190f',
  exp: Date.now() + 300 * 1000000,
  nbf: 0,
  iat: Date.now(),
  iss: oauthServerUrl + '/realms/' + oauthRealm,
  aud: 'account',
  sub: sub || adminSub,
  typ: 'Bearer',
  azp: 'dr1',
  auth_time: 0,
  session_state: 'e9be3c35-0ac6-4117-a314-86bdd012a3c9',
  acr: '1',
  groups: group ? [...otherGroups, defaultGroup, group] : [...otherGroups, defaultGroup],
  scope: 'email profile',
  email_verified: true,
  name: 'ehila asd',
  preferred_username: 'juan',
  given_name: 'bbbb',
  family_name: 'asd',
  email: 'hello@example.com',
});

export const sampleServiceToken = () => ({
  jti: '97b0c5b5-41fe-4e64-bd73-968b9238a1f8',
  exp: Date.now() + 300 * 1000000,
  nbf: 0,
  iat: Date.now(),
  iss: oauthServerUrl + '/realms/' + oauthRealm,
  aud: 'account',
  sub: 'b2e4c281-c9d1-4ee0-9715-bc831d16aa69',
  typ: 'Bearer',
  azp: 'dr2',
  auth_time: 0,
  session_state: 'e1b868fa-e83f-410a-856f-c3baff1242b8',
  acr: '1',
  realm_access: {
    roles: ['dataroom_node'],
  },
  resource_access: { 'realm-management': { roles: ['view-users', 'query-groups', 'query-users'] } },
  scope: 'email profile',
  email_verified: false,
  clientHost: '93.145.86.22',
  clientId: 'dr2',
  preferred_username: 'service-account-dr2',
  clientAddress: '93.145.86.22',
});

export const testPrivateKey = readFileSync(resolve(__dirname, './jwtRS256.key')).toString();
export const testPublicKey = readFileSync(resolve(__dirname, './jwtRS256.key.pub')).toString();

export const getSignedToken = (group?: string, sub?: string) =>
  'Bearer ' +
  sign(sampleToken(group, sub), testPrivateKey, {
    algorithm: 'RS256',
  });

export const getSignedServiceToken = (token = sampleServiceToken()) =>
  'Bearer ' + sign(token, testPrivateKey, { algorithm: 'RS256' });

export const testFileContent = 'VERY GOOD DATA';

export const testFileNotarization = (entityId: string, data: string, date: Date = new Date()): Notarization => {
  const fileDigest = `0x${createHash('sha256').update(data).digest('hex')}`;
  const notarizedObject = {
    id: entityId,
    notarizedAt: date.toISOString(),
    digest: fileDigest,
  };
  return {
    digest: `0x${hash(notarizedObject, 'hex')}`,
    notarizedAt: date,
    notarizedPayload: JSON.stringify(notarizedObject),
    transactionId: 'whaaat',
  };
};

export const customerToken = getSignedToken();
