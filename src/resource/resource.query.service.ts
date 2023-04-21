import { Injectable, ForbiddenException, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  ObjectId,
  FindOptions,
  InsertOneOptions,
  BulkWriteOptions,
  UpdateFilter,
  Sort,
  Document,
  WithId,
  OptionalUnlessRequiredId,
  Filter,
} from 'mongodb';
import { Connection, FilterQuery } from 'mongoose';
import * as _ from 'lodash';

import { ValidatorService } from '../validator/validator.service';

import { JwtPayload } from '@Types/auth';
import { Cursor, Timestamped } from '@Types/common';

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
    @InjectConnection() private readonly connection: Connection,
    // private readonly authService: AuthService,
    @Inject(ConfigService) private readonly conf: ConfigService,
    @InjectPinoLogger(ResourceQueryService.name) private readonly logger: PinoLogger,
  ) {
    this.supportedResources = this.conf.get('SUPPORTED_RESOURCES').split(',');
  }

  // getAllowedResourceSections(resourceClassName: string) {
  //   return resourceDefs[resourceClassName as keyof typeof resourceDefs].sections;
  // }

  async _findOne<Document>(
    collectionName: string,
    search: FilterQuery<Document>,
    options?: FindOptions<Document>,
  ): Promise<WithId<Document>> {
    this.checkValidResourceCollection(collectionName);
    return this.connection.db.collection<Document>(collectionName).findOne(search, options);
  }

  async _getResourceById<Document>(
    collectionName: string,
    resourceId: string | ObjectId,
    projection?: string[],
  ): Promise<WithId<Document>> {
    // return this._findOne(collectionName, { _id: resourceId instanceof ObjectId ? resourceId : new ObjectId(resourceId) }, {});
    return this._findOne<Document>(
      collectionName,
      { _id: resourceId instanceof ObjectId ? resourceId : new ObjectId(resourceId) },
      { projection: projection },
    );
  }

  async _create<Document>(
    collectionName: string,
    assetData: OptionalUnlessRequiredId<Document>,
    options?: InsertOneOptions,
  ): Promise<{ id: string }> {
    this.checkValidResourceCollection(collectionName);
    const created = this.connection.db
      .collection<Document>(collectionName)
      .insertOne({ ...assetData, createdAt: new Date(), updatedAt: new Date() }, options);
    return { id: (await created).insertedId.toString() };
  }

  async _createMany<Document>(
    collectionName: string,
    assetsData: OptionalUnlessRequiredId<Document>[],
    options?: BulkWriteOptions,
  ): Promise<any> {
    this.checkValidResourceCollection(collectionName);
    const created = await this.connection.db.collection<Document>(collectionName).insertMany(assetsData, options);
    return created;
  }

  async _aggregate<Document>(collectionName: string, aggregation: any) {
    this.checkValidResourceCollection(collectionName);
    return await (await this.connection.db.collection<Document>(collectionName).aggregate(aggregation)).toArray();
  }

  async _find<Document>(
    collectionName: string,
    filter: Filter<Document> = {},
    options?: FindOptions<Document>,
  ): Promise<WithId<Document>[]> {
    this.checkValidResourceCollection(collectionName);
    return (await this.connection.db.collection<Document>(collectionName).find(filter, options)).toArray();
  }

  async _deleteMany<Document>(collectionName: string, search: FilterQuery<Document> = {}) {
    this.checkValidResourceCollection(collectionName);
    return this.connection.db.collection<Document>(collectionName).deleteMany(search);
  }

  async _delete(collectionName: string, resourceId: string | ObjectId): Promise<any> {
    this.checkValidResourceCollection(collectionName);
    return this.connection.db
      .collection(collectionName)
      .deleteOne({ _id: resourceId instanceof ObjectId ? resourceId : new ObjectId(resourceId) });
  }

  async _count<Document>(collectionName: string, search: FilterQuery<Document>) {
    this.checkValidResourceCollection(collectionName);
    return this.connection.db.collection<Document>(collectionName).countDocuments(search);
  }

  async _updateOne<Document>(collectionName: string, resourceId: string | ObjectId, update: UpdateFilter<Document>) {
    this.checkValidResourceCollection(collectionName);
    const filter = {
      _id: resourceId instanceof ObjectId ? resourceId : new ObjectId(resourceId),
    } as unknown as Filter<Document>;
    return this.connection.db
      .collection(collectionName)
      .findOneAndUpdate(filter, { $set: update }, { returnDocument: 'after' });
  }

  async _updateMany(collectionName: string, filter: FilterQuery<any>, update: UpdateFilter<any>): Promise<any> {
    this.checkValidResourceCollection(collectionName);
    return this.connection.db.collection(collectionName).updateMany(filter, update, { upsert: true });
  }

  async _createIndexes(collectionName: string, indexes): Promise<any | null> {
    this.checkValidResourceCollection(collectionName);
    // https://www.mongodb.com/docs/v5.0/reference/method/db.collection.createIndexes/#mongodb-method-db.collection.createIndexes
    try {
      await this.connection.db.collection(collectionName).createIndexes(indexes);
    } catch (e) {
      this.logger.error(e);
    }
  }

  async _dropIndexes(collectionName: string): Promise<any | null> {
    this.checkValidResourceCollection(collectionName);
    // https://www.mongodb.com/docs/v5.0/reference/method/db.collection.dropIndexes/#mongodb-method-db.collection.dropIndexes
    try {
      await this.connection.db.collection(collectionName).dropIndexes();
    } catch (e) {
      this.logger.error(e);
    }
  }

  async _attachValidator(collectionName: string, scheme): Promise<any | null> {
    this.checkValidResourceCollection(collectionName);
    // https://stackoverflow.com/questions/44318188/add-new-validator-to-existing-collection
    const validator = JSON.parse(JSON.stringify(scheme).replace(/"type"/g, '"bsonType"'));
    try {
      this.connection.db.collection(collectionName).options['validator'] = validator;
    } catch (e) {
      this.logger.error(e);
    }
  }

  checkValidResourceCollection(resourceClassName: string) {
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

  async accessResource<Document>(
    grant: JwtPayload,
    resourceClassName: string,
    resourceId: string | ObjectId,
    // excludedSectionNames: string[],
    options?: FindOptions<Document>,
  ): Promise<WithId<Document>> {
    // we assume that portfolio access is checked before this method is called
    // if (!this.authService.hasAnyRole(grant, allowedRoles)) {
    //   this.logger.warn('You dont have role allowing to access this resource');
    //   throw new ForbiddenException();
    // }

    const resource = await this._findOne<Document>(
      resourceClassName,
      { _id: resourceId instanceof ObjectId ? resourceId : new ObjectId(resourceId) },
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
    collectionName: string,
    query: FilterQuery<any>,
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
