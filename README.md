# pontegg.io

_"Give us the tools and we finish the job"_ - Winston Churchill

`pontegg.io` is opinionated [nest.js](https://nestjs.com) scaffolding aiming to reduce boilerplate, increase security. It aims to shorten all typical repetitive development tasks allowing to lunch new APIs fast and focus on particular software business logic. It does not makes your coffee yet.

Attention!. It uses mongodb in 'schemaless' manner. Everything depends of robustness of your json schemes.

see the presentation [pontegg.io](https://docs.google.com/presentation/d/e/2PACX-1vSt4WwVuXGoTSdkQIisI0zePXYxE4kzceV9uPBW6pyAfP3uUp7HUpTVtovT8iT8kyCFTmLs8eSowozd/pub?start=false&loop=false&delayms=3000)

## Installation & Configuration

```bash
$ pnpm install
```

see further installation steps in [docs/instalation.md](docs/instalation.md)

## Features

- [x] automatic CRUD REST API controller creation
- [x] automatic API documentation (OpenAPI/swagger)
- [x] multilayer fine grained access control ([ACL](https://en.wikipedia.org/wiki/Access-control_list))
- [x] role/group based access control to act upon the resource and its individual section ([RBAC](https://en.wikipedia.org/wiki/Role-based_access_control)).
- [x] api declaratively defined in one json file.
- [x] simple but powerful state management
- [x] out of the box file/s upload api
- [x] automatic data validation [json schema](https://json-schema.org/)
- [x] automatic data sanitization & coercion
- [x] automatic data sorting
- [x] event sourcing (Events)
- [x] resource section versioning
- [x] test automation
- [x] SSE (Server Sent Events)

## Why?

Very often we cross with situation when resource (entity) has complex structure which is build up during process of interaction of different actors which on each step are allowed to commit particular section of the resource.

`pontegg.io` is not intended for the scenarios where domain has a lot of related entities. It works well when complexity is confined in few arbitrarily complex resources.
Currently it does not provide ORM nor GraphQl since 'complexity' is not scattered across many entities/tables.

If domain logic requires many related entities, or there is no interaction of different actors it is better look for other solutions.

## Security

App can accessed only by authenticated users. Authentication happens after checking validity of JWT token. Which is renewed periodically.

Solution apply `security by default` methodology,[RBAC](https://en.wikipedia.org/wiki/Role-based_access_control) and [ACL](https://en.wikipedia.org/wiki/Access-control_list) principles. Roles and permissions should be explicitly defined for each operation on each resource.

Every API call is evaluated following the rules:

1. Is user authenticated?
2. Is user allowed to access resource api endpoint (ACL)?
3. Does user meets conditions to access particular resource (RBAC)?
4. Does user user meets conditions to perform action on resource section?

## State management

`pontegg.io` provides simple but powerful state management. Transition from one state to another is govern by 'rules'. Rules expose conditions which if satisfied allow transition to next sate to happen.
Every state change emits 'event' ([event sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)) containing 'payload' and 'actor' data. Event can be intercepted by any other component and act in consequence.

## Components

1. _ResourceServices_ - provide factory method to instantiate 'Resource Model' together with it's controller and services

   - ResourceQueryService - provides CRUD operations wrapped around native mongodb queries

2. _Auth_ - Responsible for authentication. Provides JWT token validation.

3. _i18n_ - Localization

4. _Validator_ - Ajv based json scheme validator

## Usage

1. _Setup json schemes_ for your resource at `shared/schemes` folder. Each section of the resource should have its own schema. Json Schemes defacto define resource structure and serve to validate incoming requests. For example:

   - `shared/schemes/user/user.scheme.ts` - schema for user resource
   - `shared/schemes/user/profile.section.scheme.ts` - schema for user profile section
   - `shared/schemes/user/contacts.section.scheme.ts` - schema for user contacts section

   Main scheme should be exported as `default` and sections as named exports.
   Scheme file name should follow the pattern: `[resource-name].scheme.ts`. Section file name should follow the pattern: `[resource-name].[section-name].scheme.ts`.
   Scheme should be defined following Object notation. For example:

   ```typescript
   const scheme = {
     type: 'object',
     properties: {
       name: { type: 'string' },
       email: { type: 'string' },
       password: { type: 'string' },
     },
   } as const;
   export default scheme;
   ```

   > @ATTENTION. `scheme` must be defined with `as const`.

   All Schemes should be valid [json schema](https://json-schema.org/)
   All resource schemes should be registered and exported in `index.ts` file. For example:

   ```typescript
   import user from './user.scheme';
   import profile from './profile.scheme';
   import contacts from './contacts.scheme';

   export const schemes = [
     ['user', user],
     ['profile.section', profile],
     ['contacts.section', contacts],
   ];
   ```

2. _Register Types_ for your resource at `shared/types` folder. For example:

   ```typescript
   import { FromSchema } from 'json-schema-to-ts';
   import { DeserializeDate, WithId } from './common';

   import user from '../schemes/user/user.scheme';
   import profile from '../schemes/user/profile.section.scheme';
   import contacts from '../schemes/user/contacts.section.scheme';

   export type User = FromSchema<typeof user, DeserializeDate>;
   export type UserProfile = FromSchema<typeof profile, DeserializeDate>;
   export type UserContacts = FromSchema<typeof contacts, DeserializeDate>;

   type StoredUser = WithId<User>;
   export default StoredUser;
   ```

   Main type should be exported as `default` and sections as named exports.

   > @TIP. You may register some 'partial' types for the convenience.

3. Set Resource Model using factory method in `user/user.module.ts` file. For example:

   ```typescript
   import { Module, DynamicModule } from '@nestjs/common';

   import ResourceBaseService from '../resource/resource.service';
   import { resourceModuleFactory } from '../resource/module-factory';

   export class UserService extends ResourceBaseService {}

   @Module({})
   export class UserModule {
     static register(): Promise<DynamicModule> {
       return resourceModuleFactory(this, 'user', UserService);
     }
   }
   ```

   > @TIP. You may override methods of `ResourceBaseService` class or add new 'specialized'.

4. Register User Model in `app.module.ts` file. For example:

   ```typescript
   import { Module } from '@nestjs/common';
   import { ConfigModule } from '@nestjs/config';
   import { TypeOrmModule } from '@nestjs/typeorm';

   import { UserModule } from './user/user.module';

   @Module({
     imports: [ConfigModule.forRoot(), TypeOrmModule.forRoot(), UserModule.register()],
   })
   export class AppModule {}
   ```

5. Define API behavior at `user/user.api.ts`:

   ```typescript
   import scheme from '@Schemes/user.scheme';
   import API from '@Types/api';

   export type Actor = 'user' | 'admin';

   const api: API<Actor> = {
    resourceSchemeName: 'user',
    scheme,
    states: scheme.properties.state.enum,
    indexes: [{ key: { userId: 1 } }, { key: { createdAt: 1 } }, { key: { updatedAt: 1 } }],
    sections: {
      profile: {
        create: {
          let: ['admin', { for: 'user', if: { state: ['init'] } }],
          set: { state: 'profileCreated' },
        },
      },
      contacts: {
        create: {
          let: ['admin', { for: 'user', if: { state: ['init'] } }],
          set: { state: 'contactsCreated' },
        },
      },
    },
    get: {
      let: ['admin', { for: 'user', if: { user: '_id' } }],
    },
    create: {
      let: [
        { for: 'user', validate: 'create.user', set: 'authId' },
        { for: 'admin', validate: 'admin.create.user' },
      ],
      set: { state: 'init' },
    },
    delete: {
      let: ['admin'],
    },
    update: {
      roles: ['admin'],
    },
    list: {
      let: ['admin'],
      query: ['userId', 'state'],
      projection: ['userId', 'invoice', 'document'],
    },
   };
   export default api;
   ```

We can define CRUD actions for the resource and sections:

- `get` - GET resource request
- `create` - POST request - creates new resource
- `update` - PUT request - updates existing resource
- `delete` - DELETE request - deletes existing resource
- `list` - GET request listing resources.
- `sections` - defines behavior for sections.

For each CRUD endpoint and each 'section'. We can define:

- `let` - array of roles (string - name of role or object with some conditions) that are allowed to perform the action.
- `if` - defines conditions for the action. For example, where `if` is set to `{ state: ['init', 'profileCreated'] }` then only resources with `state` equal to `init` or `profileCreated` will be accessible.
  ex: `if: { user: { state: ['init'] } }` - it means for 'user' that state should be 'init'.
- `validate` - defines validation schema for the action if it differs from the resource scheme or particular section scheme.
- `set` - it can be used to change state value (or any other property). For example: `{ state: 'invoiceFileUploaded' }`.

`get` - defines behavior of GET request.

`list` may receive additional parameters:

- `query` - defines query parameters that are allowed to be used in the request.
- `projection` - defines projection for returned query.

On `create` action 'if' conditions refer to the user properties. For example, if `if: { state: ['kyc'] }` then only users with `state` equal to `kyc` will be able to create resource.

On `update` action 'if' conditions refer to the present resource properties. For example, if `if: { state: ['approved'] }` then resource will be updated only when `state` equal to `approved`.

There can be multiple 'if' conditions which correspond to 'OR' boolean operation. Which means that if at least one condition is met then the action is allowed.

## Authentication

`pontegg.io` uses JWT token for authentication. It was tested with [Keycloak](https://www.keycloak.org/). It follows [RBAC](https://en.wikipedia.org/wiki/Role-based_access_control). It means that user can have multiple roles and each role can have multiple permissions. Roles are directly by groups. User may belong to multiple groups.

## Test automation

`pontegg.io` provides test automation testing all CRUD operations and sections. For example:

```typescript
import { HttpRequests, Payloads, Uploads, testResourceE2E } from './testHelpers';
import { groups } from '@wizkey/ecogenius-shared/src/types/auth';
import apiDef from '../src/projects/projects.api';
import { httpMock, httpMockCrud } from './mocks/notifications';

import { Actor } from '@Types/auth';
import { Project as Resource } from '@Types/projects';

// fixtures
import { info } from './mocks/project';

// test files
const filePdf = resolve('./test/files/test.pdf');
const fileJpg = resolve('./test/files/test.jpg');

const uploads: Uploads<Actor, Resource, API<Actor, Resource>> = {
  image: {
    succeeds: [
      ['jpeg', fileJpg],
      ['png', filePng],
    ],
    fails: [
      ['big pdf file (>5 MB)', bigFile12MbPdf],
      ['jpeg', fileJpg],
    ],
  },
};

const payloads: Payloads<Actor, Resource, API<Actor, Resource>> = {
  info: {
    succeeds: [['expected payload', info]],
    fails: [
      ['wrong payload', { isApproved: 'ssd' }],
      ['additional data', { ...info, additional: 'data' }],
      ['wrong data', { ...info, budget: -100000 }],
    ],
  },
};

const resourceName = 'projects';
// basic resource data
const residualData = { projects: [projectData], principals: [principalData] };

// mocks for all http requests
const httpMockAll: HttpRequests<any> = {
  ...httpMockCrud,
  approved: httpMock,
};

const httpRequests: HttpRequests<Resource> = httpMockAll;

describe(`Projects Controller`, () => {
  testResourceE2E<Actor, Resource>({
    resourceName,
    groups,
    apiDef,
    uploads,
    payloads,
    residualData,
    httpRequests,
  });
});
```

## Extending pontegg.io

`Pontegg.io` tries to address most common use cases, when it comes short on functionality it is possible to extend it further with custom logic.

- Each POST, PUT, DELETE operation emits Event (`ResourceCreatedEvent`, `ResourceDeletedEvent`, `ResourceUpdatedEvent`) which can be handled by custom listeners and further work on it. It can be used to send notifications, log events to audit log, etc. Events are emitted **after** resource is created, updated or deleted.

- If endpoint needs some custom logic which result must be returned to the client, then it can be done by adding custom endpoint to the controller (usual nest way). In this scenario you can still benefit using present methods to validate incoming data, sanitize, validate user access, etc.

## TODO

- [ ] automatic data pagination
- [ ] add support for (GraphQL)[https://graphql.org/]
- [ ] add support MongoDB Schemas
- [ ] add support for complex state transition rules (OR, AND, NOT, etc.)
- [ ] add support for rejecting uploads with not whitelisted file extensions

## License

[MIT](LICENSE)
