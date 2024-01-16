import { ForbiddenException } from '@nestjs/common';
import { Allowed, Condition } from '@Types/api';

export type AccessAllowance<Actor, Resource> = Array<[Actor, Allowed<Actor, Resource> | boolean]>;

type Expectation = string | boolean;

// interface ApplyRules<Actor extends string, Resource> {
//   currentUserRoles: Record<Actor, any>;
//   rules: Get<Actor, Resource>;
//   resource: any;
//   mainValidationScheme: string;
//   process?: () => void;
// }

export type CurrentUserData<Actor extends string | number | symbol> = Record<Actor, any> | undefined;

export type CurrentUserRoles<Actor extends string | number | symbol, Resource> = Array<
  [Actor, Condition<Actor, Resource> | undefined | boolean, CurrentUserData<Actor> | undefined]
>;

export function verifyAccess<Actor extends string | number | symbol, Resource>(
  resourceName: string,
  resource: any,
  currentUserRoles: CurrentUserRoles<Actor, Resource>,
) {
  return currentUserRoles.some(([roleName, conditions, userData]) =>
    verifyAccessRules(resourceName, resource, roleName as string, conditions, userData),
  );
}

export function verifyAccessRules<Actor extends string | number | symbol, Resource>(
  resourceName: string,
  resource: any,
  roleName: string,
  conditions: Condition<Actor, Resource> | boolean,
  userData: CurrentUserData<Actor>,
) {
  if (typeof conditions === 'boolean') return true;
  if ('if' in conditions) {
    const ifCondition = conditions.if;
    return Object.entries(ifCondition).map(([condition, expected]) =>
      verifyCondition(roleName, resourceName, resource, condition, expected as Expectation, userData),
    );
  } else if ('validate' in conditions) {
    return { validate: conditions.validate };
  } else if ('appendId' in conditions) {
    return { appendId: conditions.appendId };
  } else {
    return false;
  }
}

function verifyCondition(
  roleName: string,
  resourceName: string,
  resource: any,
  condition: string,
  expected: Expectation,
  userData: CurrentUserData<any>,
): boolean {
  if (roleName === condition) {
    // we check user itself
    if (!userData) throw new ForbiddenException();
    const userIdName = `${roleName}Id`;
    if (expected === userIdName) {
      const userId = userData._id.toString();
      const resourceUserId = resource[userIdName];
      const resourceBelongsToCustomer = resourceUserId === userId;
      if (!resourceBelongsToCustomer) {
        throw new ForbiddenException(
          `Can not modify resource not owned by current user (${resourceName}.${userIdName}: "${resource[userIdName]}", ${roleName}._id: "${userData._id}")`,
        );
      }
      return true;
    }
    return resource[expected as string] === userData[expected as string];
  }
  const currentValue = resource[condition];
  const isValid = Array.isArray(expected) ? expected.includes(currentValue) : currentValue === expected;
  if (!isValid) {
    throw new ForbiddenException(
      `Can not modify resource if ${condition} != "${expected}" (currently: "${currentValue}")`,
    );
  }
  return isValid;
}

export async function grantGetResourceAccess<Actor extends string | number | symbol, Resource>(
  resourceName: string,
  currentUserRoles: CurrentUserRoles<Actor, Resource>,
  resource: Resource,
) {
  if (currentUserRoles.length === 0) {
    throw new ForbiddenException();
  }
  const accessAllowance = verifyAccess(resourceName, resource, currentUserRoles);
  if (!accessAllowance) {
    throw new ForbiddenException();
  }
}

export function getAccessAllowance(userResourceAccessRoles, accessConditions) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const accessAllowance = Object.entries(userResourceAccessRoles).map(([name, user]) => [name, accessConditions[name]]);
  if (accessAllowance.length === 0) throw new ForbiddenException();
  return accessAllowance;
}

function getRoleAccess(role, allow) {
  return allow[role] || true;
}

export async function grantModifySectionAccess<Actor, Resource>(
  actualUserRoles,
  resource,
  accessRules: AccessAllowance<Actor, Resource>,
) {
  const accessAllowance = actualUserRoles.map((role) => [role, getRoleAccess(role, accessRules)]);
  if (accessAllowance.length === 0) throw new ForbiddenException();
  if (accessAllowance.some((role) => role[1] === true)) return true;
  // const userAccessAllowance = actualUserRoles.map((role) => verifyAccessRules(resource, role, accessRules));
  // const isAllowed = userAccessAllowance.some((allowed) => !!allowed);
  // if (!isAllowed) {
  //   throw new ForbiddenException("Can't modify resource in current state");
  // }
  // return isAllowed;
}
