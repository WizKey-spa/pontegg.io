import { DynamicModule, Provider, Type } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HttpModule } from '@nestjs/axios';

import { ValidatorModule } from '../validator/validator.module';
import { getControllerClass } from '../resource/resource.controller';
import ResourceQueryService from '../resource/resource.query.service';
import { StorageModule } from '../storage/storage.module';

import { ResourceClassName } from '@Types/common';

export const resourceModuleFactory = async <Document>(
  cls: Type<any>,
  resourceClassName: ResourceClassName,
  service: Type<any>,
  additionalControllers?: Type<any>[],
  providers?: Provider[],
): Promise<DynamicModule> => {
  const apiDef = (await import(`../${resourceClassName}/${resourceClassName}.api`)).default;
  const controllers = getControllerClass<Document>(resourceClassName, apiDef);
  if (additionalControllers) {
    controllers.unshift(...additionalControllers);
  }
  const serviceName = `${resourceClassName.toUpperCase()}_SERVICE`;
  return {
    module: cls,
    imports: [StorageModule, CqrsModule, ValidatorModule, HttpModule],
    providers: [
      ResourceQueryService,
      service,
      {
        provide: 'RESOURCE_NAME',
        useValue: resourceClassName,
      },
      {
        // this provides service to the controller
        provide: 'RESOURCE_SERVICE',
        useClass: service,
      },
      {
        // this exposes the service to other modules
        provide: serviceName,
        useClass: service,
      },
      {
        // this api definitions to the controller & service
        provide: 'API_DEF',
        useValue: apiDef,
      },
      ...(providers || []),
    ],
    exports: [serviceName, service],
    controllers,
  };
};

export const moduleTestFactory = async (
  resourceClassName: ResourceClassName,
  service: Type<any>,
  controller?: Type<any>,
  providers?: any[],
) => {
  const apiDef = await import(`../${resourceClassName}/${resourceClassName}.api`);
  const controllers = getControllerClass(resourceClassName, apiDef);
  if (controller) {
    controllers.push(controller);
  }
  const serviceName = `${resourceClassName.toUpperCase()}_SERVICE`;
  return {
    provide: serviceName,
    providers: [
      ResourceQueryService,
      service,
      {
        provide: 'RESOURCE_NAME',
        useValue: resourceClassName,
      },
      {
        // this provides service to the controller
        provide: 'RESOURCE_SERVICE',
        useClass: service,
      },
      {
        // this exposes the service to other modules
        provide: serviceName,
        useClass: service,
      },
      {
        // this api definitions to the controller & service
        provide: 'API_DEF',
        useValue: apiDef,
      },
      ...(providers || []),
    ],
    exports: [service],
    controllers,
  };
};
