import { IEvent } from '@nestjs/cqrs';
import { JwtPayload, User } from '@Types/auth';
import { ApiOperation } from '@Types/api';

export class ResourceCreatedEvent implements IEvent {
  constructor(
    public resourceName: string,
    public payload: any,
    public resourceId: string,
    public actor: User,
  ) {}
}

export class ResourceUpdatedEvent implements IEvent {
  constructor(
    public resourceName: string,
    public operation: ApiOperation,
    public payload: any,
    public resource: Record<string, any>,
    public grant: JwtPayload,
    public actor?: User,
    public sectionName?: string,
  ) {}
}

export class ResourceDeletedEvent implements IEvent {
  constructor(
    public resourceName: string,
    public resourceId: string,
    public actor: User,
  ) {}
}
