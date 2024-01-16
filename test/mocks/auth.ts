import { JwtPayload } from '@Types/auth';
import { KeycloakUserGroup, StoredKeycloakUser } from 'src/auth/types';

export const adminJWT: JwtPayload = {
  exp: 1673517707,
  iat: 1673517407,
  jti: '5ea98cb2-5498-4762-99ea-07cb5e0ab38f',
  iss: 'https://sso.dev.ecogenius.wizkey.io/realms/master',
  sub: 'e6a0e3bb-6cba-48e3-ab1d-6bbba9cfeeb6',
  typ: 'Bearer',
  azp: 'wizkey-auth',
  session_state: '55d3c87f-404f-4747-b0e1-c76395bd3a36',
  acr: '1',
  'allowed-origins': ['*'],
  scope: 'microprofile-jwt email profile',
  sid: '55d3c87f-404f-4747-b0e1-c76395bd3a36',
  upn: 'admin@example.com',
  email_verified: false,
  name: 'Adam Admin',
  groups: ['default-roles-master', 'offline_access', 'uma_authorization', 'admins'],
  preferred_username: 'admin@example.com',
  given_name: 'Adam',
  family_name: 'Admin',
  email: 'admin@example.com',
};

export const keycloakUser: StoredKeycloakUser = {
  id: 'e6a0e3bb-6cba-48e3-ab1d-6bbba9cfeeb6',
  createdTimestamp: 1673517407,
  username: 'kjk',
  enabled: true,
  emailVerified: false,
  firstName: 'Adam',
  lastName: 'Admin',
  email: 'asd@asd.com',
  disableableCredentialTypes: [],
  requiredActions: [],
  access: {
    manageGroupMembership: true,
    view: true,
    mapRoles: true,
    impersonate: true,
    manage: true,
  },
};

export const keycloakUsers: StoredKeycloakUser[] = [
  keycloakUser,
  {
    ...keycloakUser,
    id: 'e6a0e3bb-6cba-48e3-ab1d-4bbba9cfeeb6',
    firstName: 'admin',
    lastName: 'saffi',
    email: 'asd@saffi.com',
  },
  {
    ...keycloakUser,
    id: 'e6a0e3bb-6cba-48e3-ab1d-4bbba9cfeeb4',
    firstName: 'admin',
    lastName: 'evk2',
    email: 'asd@evk2.com',
  },
  {
    ...keycloakUser,
    id: 'e6a0e3bb-6cba-48e3-ab1d-4bbba9cfeeb2',
    firstName: 'admin',
    lastName: 'investor',
    email: 'asd@investors.com',
  },
  {
    ...keycloakUser,
    id: 'e6a0e3bb-6cba-48e3-ab1d-4bbba9cfeeb2',
    firstName: 'admin',
    lastName: 'proponent',
    email: 'asd@proponent.com',
  },
  {
    ...keycloakUser,
    id: 'e6a0e3bb-6cba-48e3-ab1d-4bbba9cfeeb1',
    firstName: 'admin',
    lastName: 'technicalCommittee',
    email: 'asd@technicalCommittee.com',
  },
  {
    ...keycloakUser,
    id: 'e6a0e3bb-6cba-48e3-ab1d-2bbba9cfeeb1',
    firstName: 'admin',
    lastName: 'financialCommittee',
    email: 'asd@financialCommittee.com',
  },
];

export const keycloakUserGroup: KeycloakUserGroup = {
  id: 'e6a0e3bb-6cba-48e3-ab1d-6bbba9cfeeb6',
  name: 'admins',
  path: '/admins',
};

export const keycloakUserGroups: KeycloakUserGroup[] = [keycloakUserGroup];
