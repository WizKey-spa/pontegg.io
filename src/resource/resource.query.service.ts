import { Injectable, ForbiddenException, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ObjectId, FindOptions, Sort, Filter, Db, WithId, OptionalUnlessRequiredId } from 'mongodb';

import { ValidatorService } from '../validator/validator.service';

import { Timestamped, Cursor, ResourcesTypes, ResourceClassName } from '@Types/common';
import { JwtPayload } from '@Types/auth';

export enum ValidateOperation {
  CREATE = 'create',
  UPDATE = 'update',
}
@Injectable()
export default class ResourceQueryService {
  // public collection: Db['collection'];
  private supportedResources: string[];

  constructor(
    @Inject(ValidatorService) private readonly validatorService: ValidatorService,
    // private readonly http: HttpService,
    // private readonly authService: AuthService,
    @Inject(ConfigService) private readonly conf: ConfigService,
    @InjectPinoLogger(ResourceQueryService.name) private readonly logger: PinoLogger,
    @Inject('DB') private readonly db: Db,
  ) {
    this.supportedResources = this.conf.get('SUPPORTED_RESOURCES').split(',');
  }

  // getAllowedResourceSections(resourceClassName: string) {
  //   return resourceDefs[resourceClassName as keyof typeof resourceDefs].sections;
  // }

  async _findOne<D>(collectionName: ResourceClassName, search, options?): Promise<D> {
    this.checkValidResourceCollection(collectionName);
    return this.db.collection<D>(collectionName).findOne<D>(search, options);
  }

  async _getResourceById<D>(collectionName: keyof ResourcesTypes, resourceId: ObjectId, projection?: string[]) {
    // return this._findOne(collectionName, { _id: resourceId instanceof ObjectId ? resourceId : new ObjectId(resourceId) }, {});
    return this._findOne<D>(collectionName, { _id: resourceId }, { projection: projection });
  }

  async _create<D>(collectionName: ResourceClassName, assetData: Partial<D>, options?) {
    this.checkValidResourceCollection(collectionName);
    const created = this.db
      .collection<D>(collectionName)
      .insertOne(
        { ...assetData, createdAt: new Date(), updatedAt: new Date() } as unknown as OptionalUnlessRequiredId<D>,
        options,
      );
    return { id: (await created).insertedId.toString() };
  }

  async _createMany<D>(collectionName: ResourceClassName, assetsData, options?) {
    this.checkValidResourceCollection(collectionName);
    const created = await this.db.collection<D>(collectionName).insertMany(assetsData, options);
    return created;
  }

  async _aggregate<D>(collectionName: ResourceClassName, aggregation: any) {
    this.checkValidResourceCollection(collectionName);
    return await (await this.db.collection<D>(collectionName).aggregate(aggregation)).toArray();
  }

  async _find<D>(collectionName: ResourceClassName, filter = {}, options?): Promise<WithId<D>[]> {
    this.checkValidResourceCollection(collectionName);
    return this.db.collection<D>(collectionName).find(filter, options).toArray();
  }

  async _deleteMany<D>(collectionName: ResourceClassName, search = {}) {
    this.checkValidResourceCollection(collectionName);
    return this.db.collection<D>(collectionName).deleteMany(search);
  }

  async _delete<D>(collectionName: ResourceClassName, resourceId: ObjectId) {
    this.checkValidResourceCollection(collectionName);
    return this.db.collection<D>(collectionName).deleteOne({ _id: resourceId } as unknown as Filter<D>);
  }

  async _count<D>(collectionName: ResourceClassName, search: Filter<D>) {
    this.checkValidResourceCollection(collectionName);
    return this.db.collection<D>(collectionName).countDocuments(search);
  }

  async _updateOne<D>(collectionName: ResourceClassName, resourceId: ObjectId, update: Partial<D>) {
    this.checkValidResourceCollection(collectionName);
    return this.db
      .collection(collectionName)
      .findOneAndUpdate({ _id: resourceId }, { $set: update }, { returnDocument: 'after' });
  }

  async _versionOne<D>(collectionName: ResourceClassName, resourceId: ObjectId, update: D, version: any) {
    this.checkValidResourceCollection(collectionName);
    return this.db
      .collection(collectionName)
      .findOneAndUpdate({ _id: resourceId }, { $set: update, $push: version }, { returnDocument: 'after' });
  }

  async _updateMany<D>(collectionName: ResourceClassName, filter, update) {
    this.checkValidResourceCollection(collectionName);
    return this.db.collection<D>(collectionName).updateMany(filter, update, { upsert: true });
  }

  async _createIndexes(collectionName: ResourceClassName, indexes): Promise<any | null> {
    this.checkValidResourceCollection(collectionName);
    // https://www.mongodb.com/docs/v5.0/reference/method/db.collection.createIndexes/#mongodb-method-db.collection.createIndexes
    try {
      await this.db.collection(collectionName).createIndexes(indexes);
    } catch (e) {
      this.logger.error(e);
    }
  }

  async _dropIndexes(collectionName: ResourceClassName): Promise<any | null> {
    this.checkValidResourceCollection(collectionName);
    // https://www.mongodb.com/docs/v5.0/reference/method/db.collection.dropIndexes/#mongodb-method-db.collection.dropIndexes
    try {
      await this.db.collection(collectionName).dropIndexes();
    } catch (e) {
      this.logger.error(e);
    }
  }

  async _attachValidator(collectionName: ResourceClassName, scheme): Promise<any | null> {
    this.checkValidResourceCollection(collectionName);
    // https://stackoverflow.com/questions/44318188/add-new-validator-to-existing-collection
    const validator = JSON.parse(JSON.stringify(scheme).replace(/"type"/g, '"bsonType"'));
    try {
      this.db.collection(collectionName).options['validator'] = validator;
    } catch (e) {
      this.logger.error(e);
    }
  }

  checkValidResourceCollection(resourceClassName: ResourceClassName) {
    if (!this.supportedResources.includes(resourceClassName)) {
      throw new ForbiddenException(`You can't operate on non resource collection "${resourceClassName}"`);
    }
  }

  // prepare4mongo = (resourceClassName: string, data: any, sectionName?: string) => {
  //   const dateFields = resourceDefs[resourceClassName as keyof typeof resourceDefs]?.fields.date;

  //   // TODO it does not work for nested arrays
  //   dateFields &&
  //     dateFields.forEach((fieldPath: string) => {
  //       // removes section name form fieldpath
  //       fieldPath = sectionName ? fieldPath.replace(`${sectionName}.`, '') : fieldPath;
  //       const date = _.get(data, fieldPath);
  //       if (date) {
  //         _.set(data, fieldPath, new Date(date));
  //       }
  //     });
  //   return data;
  // };

  private excludeSections = (excludedSectionNames: string[]) =>
    Object.fromEntries(excludedSectionNames.map((sectionName) => [sectionName, 0]));

  async accessResource<D>(
    grant: JwtPayload,
    resourceClassName: ResourceClassName,
    resourceId: ObjectId,
    // excludedSectionNames: string[],
    options?: FindOptions<D>,
  ) {
    // we assume that portfolio access is checked before this method is called
    // if (!this.authService.hasAnyRole(grant, allowedRoles)) {
    //   this.logger.warn('You dont have role allowing to access this resource');
    //   throw new ForbiddenException();
    // }

    const resource = await this._findOne<D>(
      resourceClassName,
      { _id: resourceId } as unknown as Filter<D>,
      options,
      // ? options
      // : {
      //     projection: this.excludeSections(excludedSectionNames),
      //   },
    );
    if (!resource) {
      throw new NotFoundException(`Resource with Id '${resourceId}' not found`);
    }

    return resource;
  }

  // getResourceProjection = (resourceClassName: string) => [
  //   ...baseResourceProjection,
  //   ...resourceDefs[resourceClassName as keyof typeof resourceDefs].projections.default,
  // ];

  validate(resourceClassName: string, operation: ValidateOperation, data: any) {
    const validator = this.validatorService.getValidator(resourceClassName);
    const validation = validator.getSchema(`asset.${operation}`);
    const assetIsValid = validation && validation(data);
    if (validation && !assetIsValid) {
      throw new BadRequestException(validation.errors);
    } else {
      return data;
    }
  }

  async paginate<T extends Timestamped, K extends keyof T>(
    collectionName: ResourceClassName,
    query: Filter<any>,
    cursorOpts: Cursor<T, K>,
    projection?: Array<keyof T>,
  ) {
    // : Promise<CursorResult<Resource<any>, unknown>>
    this.checkValidResourceCollection(collectionName);
    const cursor = Object.assign(
      {
        limit: 20,
      },
      cursorOpts,
    );

    const fieldIsString = cursor.field === 'name';
    const fromOperator = fieldIsString ? '$gt' : '$lt';
    const sortDirection = fieldIsString ? +1 : -1;
    const collation = fieldIsString ? { strength: 1, locale: 'en' } : null;

    const find = cursor.from ? { ...query, [cursor.field]: { [fromOperator]: cursor.from } } : query;
    const sort = { [cursor.field]: sortDirection } as Sort;
    const limit = cursor.limit + 1;

    let items = await this._find(collectionName, find, { projection, sort, limit, collation });

    if (items.length === 0) {
      return {
        items,
        hasMore: false,
        cursor: null,
      };
    } else {
      const originalLength = items.length;
      items = items.slice(0, cursor.limit);
      const lastVal = this.getLastValue(items as unknown as T[], cursor.field);
      return {
        items,
        cursor: { ...cursor, from: lastVal },
        hasMore: originalLength > cursor.limit,
      };
    }
  }

  getLastValue = <T>(items: T[], field: keyof T) => {
    const lastVal = items[items.length - 1][field];
    return lastVal instanceof Date ? lastVal.toISOString() : lastVal;
  };
  // validateSection(resourceClassName: string, sectionName: string, data: any) {
  //   const validator = assetValidators[resourceClassName];
  //   const validation = validator.getSchema(`${sectionName}`);
  //   const resourceIsValid = validation && validation(data);
  //   if (validation && !resourceIsValid) {
  //     throw new BadRequestException(validation.errors);
  //   } else {
  //     return data;
  //   }
  // }

  // validateResourceClass = (resourceClassName: string) => {
  //   if (!this.supportedResources.includes(resourceClassName)) {
  //     throw new BadRequestException(`ValidationError: '${resourceClassName}' is not supported in this dataroom`);
  //   }
  // };

  // async createValid(portfolioId: string, resourceClassName: string, data: Resource<any>) {
  //   this.validate(resourceClassName, ValidateOperation.CREATE, data);
  //   const preparedData = this.prepare4mongo(resourceClassName, data);
  //   return this._create(resourceClassName, { ...preparedData, portfolioId });
  // }
}
