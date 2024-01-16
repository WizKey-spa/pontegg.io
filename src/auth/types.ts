export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
}

export interface RefreshToken {
  refreshToken: string;
}

type Credentials = {
  type: string;
  value: string;
  temporary: boolean;
};

export type KeycloakUser = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  groups: string[];
  credentials: Credentials[];
  requiredActions: string[];
};

export interface StoredKeycloakUser {
  id: string;
  createdTimestamp: number;
  username: string;
  enabled: true;
  totp?: boolean;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  email: string;
  disableableCredentialTypes: string[];
  requiredActions: string[];
  notBefore?: number;
  access: {
    manageGroupMembership: boolean;
    view: boolean;
    mapRoles: boolean;
    impersonate: boolean;
    manage: boolean;
  };
}

export interface KeycloakUserGroup {
  id: string;
  name: string;
  path: string;
}

export type KeycloakUserGroups = KeycloakUserGroup[];

export type Login = {
  username: string;
  password: string;
};

export interface AuthRes {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  'not-before-policy': number;
  session_state: string;
  scope: string;
}
