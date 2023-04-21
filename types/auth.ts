export interface JwtPayload {
  exp: number;
  iat: number;
  jti: string;
  iss: string;
  aud?: string[];
  sub: string;
  typ: string;
  azp: string;
  acr?: string;
  session_state: string;
  upn: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [clientId: string]: {
      roles: string[];
    };
  };
  'allowed-origins'?: string[];
  groups?: string[];
  scope: string;
  sid: string;
  email_verified: boolean;
  name: string;
  preferred_username: string;
  given_name: string;
  family_name?: string;
  email: string;
  token?: string;
  user?: Record<string, any>;
}

export interface User {
  authId: string;
  name: string;
  preferred_username: string;
  given_name: string;
  family_name?: string;
  email: string;
}

export interface JWT {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  not_before_policy: number;
  session_state: string;
  scope: string;
}

export type Actor = 'customer' | 'insurer' | 'bellerofonte-admin';

const adminJWT: JwtPayload = {
  exp: 1673517707,
  iat: 1673517407,
  jti: '5ea98cb2-5498-4762-99ea-07cb5e0ab38f',
  iss: 'https://sso.dev.bellerofonte.wizkey.io/realms/master',
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
  groups: ['default-roles-master', 'offline_access', 'uma_authorization', 'bellerofonte-admin'],
  preferred_username: 'admin@example.com',
  given_name: 'Adam',
  family_name: 'Admin',
  email: 'admin@example.com',
};
