import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Inject,
  PreconditionFailedException,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Db, ObjectId, FindOptions, Document, Filter } from 'mongodb';
import { createHash } from 'crypto';
import * as _ from 'lodash';
import Ajv from 'ajv';

import { EventEmitter, Readable } from 'stream';

import ResourceQueryService from './resource.query.service';
import { StorageService } from '../storage/storage.service';
import { dates2str } from '../lib/dates2str';

import { FileUploadedEvent } from './events/FileUploadedEvent';
import { ResourceCreatedEvent, ResourceDeletedEvent, ResourceUpdatedEvent } from './events/resourceEvents';
import { DocumentMetadataDTO } from './document.dto';
import { Cursor } from './resource.dto';

import { Actor, JwtPayload, User } from '@Types/auth';
import { FileUpload, StoredFile } from '@Types/document';
import { Let, Allowed, ApiOperation, Condition, SseMsg } from '@Types/api';
// import { Cursor } from 'src/common.dto';
import { ValidatorService } from '../validator/validator.service';
import { CurrentUserData, CurrentUserRoles, grantGetResourceAccess, verifyAccess } from './resource.accces';
import { ResourceClassName } from '@Types/common';
import { Observable, fromEvent } from 'rxjs';
import Resource from '@Types/resource';

export enum ValidateOperation {
  CREATE = 'create',
  UPDATE = 'update',
}

const baseResourceProjection = ['_id', 'state', 'createdAt', 'updatedAt'];

@Injectable()
export default class ResourceBaseService {
  public collection: Db['collection'];
  private validator: Ajv;
  private readonly emitter: EventEmitter;

  constructor(
    @Inject('RESOURCE_NAME') readonly resourceClassName: ResourceClassName,
    @Inject('API_DEF') readonly apiDef: Record<string, any>,
    @Inject(ValidatorService) public readonly validatorService: ValidatorService,
    readonly eventBus: EventBus,
    @Inject(ConfigService) readonly conf: ConfigService,
    readonly storage: StorageService,
    @Inject(ResourceQueryService) readonly resourceQueryService: ResourceQueryService,
    @InjectPinoLogger(ResourceBaseService.name) readonly logger: PinoLogger,
  ) {
    // this.validator = resourceValidators[this.resourceClassName];
    if (apiDef.indexes) {
      this.resourceQueryService._createIndexes(this.resourceClassName, apiDef.indexes);
    }
    this.validator = validatorService.getValidator(this.resourceClassName);
    this.emitter = new EventEmitter();
  }

  getUserGroups<Actor extends string | number | symbol>(grant: JwtPayload): CurrentUserData<Actor> {
    return grant.user as CurrentUserData<Actor>;
  }

  getActualUserRoles<Actor extends string | number | symbol, Resource>(
    currentUser: CurrentUserData<Actor>,
    accessConditions: Let<Actor, Resource>,
  ): CurrentUserRoles<Actor, Resource> {
    return accessConditions.reduce((acc = [], condition: Allowed<Actor, Resource>) => {
      const cond = typeof condition === 'string' ? [condition, true] : [condition['for'], condition];
      // we append user data
      cond.push(currentUser[cond[0]]);
      if (cond[0] in currentUser) {
        acc.push(cond);
      }
      return acc;
    }, []);
  }

  async get<D>(grant: JwtPayload, resourceId: ObjectId): Promise<D> {
    const allow = this.apiDef.get.let;
    if (!allow) {
      throw new NotImplementedException();
    }
    const resource = await this.accessResource<D>(grant, resourceId);
    const actualUserRoles = this.getActualUserRoles(this.getUserGroups(grant), allow);
    await grantGetResourceAccess(this.resourceClassName, actualUserRoles, resource);
    return resource;
  }

  async applyListAccess(name: string, accessRules, userData) {
    // if (accessRules.includes(name)) return true;
    if (accessRules === true) return {};
    try {
      const searchWith = accessRules.if[name];
      const searchId = userData._id.toString();
      if (!searchId) throw new ForbiddenException();
      return { [searchWith]: searchId };
    } catch (e) {
      throw new ForbiddenException(e);
    }
  }

  async list<Document>(grant: JwtPayload, cursor: Cursor) {
    const allow = this.apiDef.list.let;
    if (cursor?.state && !this.apiDef.states.includes(cursor.state)) {
      throw new ForbiddenException(`invalid state "${cursor.state}"`);
    }
    const userResourceAccessRoles = this.getUserGroups(grant);
    if (Object.keys(userResourceAccessRoles).length === 0) {
      throw new ForbiddenException();
    }
    const actualUserRoles = this.getActualUserRoles(userResourceAccessRoles, allow);
    if (actualUserRoles.length === 0) {
      throw new ForbiddenException();
    }
    const userQuery = await Promise.all(
      actualUserRoles.map(([name, conditions, userData]) => this.applyListAccess(name as string, conditions, userData)),
    );

    const projection = [...baseResourceProjection, ...this.apiDef.list.projection];
    const items = await this.resourceQueryService._find<Document>(
      this.resourceClassName,
      { ...userQuery[0], ...cursor } as Filter<Document>,
      { projection },
    );
    return {
      items,
      cursor,
      hasMore: false,
    };
  }

  async getSection<Document>(grant: JwtPayload, resourceId: ObjectId, sectionName: string) {
    const allow = this.apiDef.get.access;
    const resource = await this.accessResource<Document>(grant, resourceId);
    const actualUserRoles = this.getActualUserRoles(this.getUserGroups(grant), allow);
    await grantGetResourceAccess(this.resourceClassName, actualUserRoles, resource);
    return resource[sectionName];
  }

  validate(validationScheme: string, data: any) {
    const validation = this.validator.getSchema(validationScheme);
    if (!validation) {
      throw new PreconditionFailedException(
        `Validation schema "${validationScheme}" for "${this.resourceClassName}" not registered`,
      );
    }
    const resourceData = _.cloneDeep(data);
    // we need to remove all fields there validation
    if ('_id' in resourceData) delete resourceData._id;
    // recursive covert Date to string at resourceData

    dates2str(resourceData);
    const assetIsValid = validation && validation(resourceData);
    if (validation && !assetIsValid) {
      this.logger.error(validation.errors);
      throw new BadRequestException(validation.errors);
    } else {
      return data;
    }
  }

  async create<Document>(grant: JwtPayload, data: any) {
    const currentUserRoles = this.getUserGroups(grant);
    if (currentUserRoles.length === 0) {
      throw new ForbiddenException();
    }
    const allow = this.apiDef.create.let;
    const actualUserRoles = this.getActualUserRoles(currentUserRoles, allow);

    // Validate & append
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    actualUserRoles.forEach(([userType, rule]) => {
      const validationScheme = (rule as Condition<Actor, Document>).validate;
      data = this.validate(validationScheme, data);
      const append = (rule as Condition<Actor, Document>).set;
      if (append && append === 'authId') {
        data[(rule as Condition<Actor, Document>).set] = grant.sub;
      }
    });

    data[`${this.resourceClassName}Id`] = new Date().getTime();

    // check if state should be changed
    const setData = this.apiDef.create.set;
    if (setData) {
      data = { ...data, ...setData };
    }

    // Coerce data to please MongoDB
    const preparedData = {
      ...this.prepare4mongo(this.resourceClassName, data),
    };

    const resource = await this.resourceQueryService._create<Document>(this.resourceClassName, preparedData);

    const user = this.getUser(grant);
    this.eventBus.publish(new ResourceCreatedEvent(this.resourceClassName, data, resource.id, user));
    this.notify(resource.id.toString(), 'create', user, data);
    return resource;
  }

  private getUser(grant): User {
    return {
      authId: grant.sub,
      name: grant.name,
      preferred_username: grant.preferred_username,
      given_name: grant.given_name,
      family_name: grant.family_name,
      email: grant.email,
    };
  }

  async update<D>(grant: JwtPayload, resourceId: ObjectId, data: any) {
    // it should be used only by admin

    const userRoles = this.getUserGroups(grant);
    if (Object.keys(userRoles).length === 0) {
      throw new ForbiddenException();
    }

    const resource = await this.accessResource<D>(grant, resourceId);
    const allow = this.apiDef.update.let;
    const actualUserRoles = this.getActualUserRoles(userRoles, allow);
    await grantGetResourceAccess(this.resourceClassName, actualUserRoles, resource);

    const preparedResource = { ...resource, ...data };
    // Validate
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    actualUserRoles.forEach(([userType, rule]) => {
      const validationScheme = this.getUpdateValidationScheme(userType as string, 'update');
      data = this.validate(validationScheme, preparedResource);
    });

    // TODO Coerce data to please MongoDB
    const preparedData = {
      ...this.prepare4mongo(this.resourceClassName, preparedResource),
    };
    const updatedResource = await this.resourceQueryService._updateOne<D>(
      this.resourceClassName,
      resourceId,
      preparedData,
    );

    const user = this.getUser(grant);
    this.eventBus.publish(
      new ResourceUpdatedEvent(this.resourceClassName, 'update', data, updatedResource, grant, user),
    );
    this.notify(resourceId.toString(), 'update', user, preparedData);
    return updatedResource;
  }

  getUpdateValidationScheme(role: string, operation: ApiOperation): string {
    try {
      const validationByOperationRole = this.apiDef[operation]?.validate[role];
      if (validationByOperationRole) return validationByOperationRole;
    } catch (e) {
      const validationBySection = this.apiDef[operation].validate;
      if (validationBySection) return validationBySection;
    } finally {
      const validationByMainScheme = this.apiDef.resourceSchemeName;
      if (validationByMainScheme) return validationByMainScheme;
    }
    throw new Error(`No ${operation} validation scheme found for role ${role}`);
  }

  async insertSection(grant: JwtPayload, resourceId: ObjectId, sectionName: string, data: any) {
    const preparedData = this.prepare4mongo(this.resourceClassName, data, sectionName);
    return this.resourceQueryService._updateOne(this.resourceClassName, resourceId, { [sectionName]: preparedData });
  }

  getSectionValidationScheme(role: string, sectionName: string, operation: ApiOperation): string {
    try {
      const validationByOperationRole = this.apiDef.sections[sectionName][operation].validate[role];
      if (validationByOperationRole) return validationByOperationRole;
    } catch (e) {
      // pass
    }

    try {
      const validationByOperation = this.apiDef.sections[sectionName][operation].validate;
      if (validationByOperation) return validationByOperation;
    } catch (e) {
      // pass
    }

    try {
      const validationBySection = this.apiDef.sections[sectionName].validate;
      if (validationBySection) return validationBySection;
    } catch (e) {
      // pass
    }

    try {
      const validationBySectionName = `${sectionName}.section`;
      if (validationBySectionName) return validationBySectionName;
    } catch (e) {
      throw new Error(`No ${operation} validation scheme found in section ${sectionName} for role ${role}`);
    }
  }

  async accessResourceModifySection<D>(
    grant: JwtPayload,
    operation: ApiOperation,
    resourceId: ObjectId,
    sectionName: string,
  ) {
    const userGroups = this.getUserGroups(grant);
    const resource = await this.accessResource<D>(grant, resourceId);

    const allowGet = this.apiDef.get.let;
    const actualUserGetRules = this.getActualUserRoles(userGroups, allowGet);
    await grantGetResourceAccess(this.resourceClassName, actualUserGetRules, resource);

    const section = resource[sectionName];

    if (!section && operation === 'update') {
      throw new BadRequestException(`Section "${sectionName}" should be already present in resource ${resourceId}`);
    }

    if (section && operation === 'create') {
      throw new BadRequestException(`Section "${sectionName}" already is present in resource ${resourceId}`);
    }

    // Verify access to modify section
    const operationConditions = this.getOperationAccess(operation, sectionName);
    const actualUserOperationConditions = this.getActualUserRoles(userGroups, operationConditions);
    verifyAccess(this.resourceClassName, resource, actualUserOperationConditions);

    // grantModifySectionAccess(actualUserRoleNames, resource, operationConditions as AccessAllowance<string>);
    return resource;
  }

  async upsertSection<D>(
    grant: JwtPayload,
    operation: ApiOperation,
    resourceId: ObjectId,
    sectionName: string,
    payload: any,
  ) {
    const resource = await this.accessResourceModifySection<D>(grant, operation, resourceId, sectionName);

    // const userGroupNames = Object.keys(this.getUserGroups(grant));
    // if (userGroupNames.length === 0) {
    //   throw new ForbiddenException();
    // }
    // Validate data for Section
    // userGroupNames.forEach((role) => {
    //   const validationScheme = this.getSectionValidationScheme(role, sectionName, operation);
    //   data = this.validate(validationScheme, data);
    // });
    return await this.doUpsertSection(grant, operation, sectionName, resource, payload);
  }

  async delete(grant: JwtPayload, resourceId: ObjectId) {
    const resource = await this.accessResource(grant, resourceId);
    const userGroups = this.getUserGroups(grant);

    const allowGet = this.apiDef.get.let;
    const actualUserGetRules = this.getActualUserRoles(userGroups, allowGet);
    await grantGetResourceAccess(this.resourceClassName, actualUserGetRules, resource);

    const allowDelete = this.apiDef.delete.let;
    const actualUserDeleteRules = this.getActualUserRoles(userGroups, allowDelete);
    const accessAllowance = verifyAccess(this.resourceClassName, resource, actualUserDeleteRules);
    if (!accessAllowance) {
      throw new ForbiddenException();
    }
    const deletedResource = await this.resourceQueryService._delete(this.resourceClassName, resourceId);

    const user = this.getUser(grant);
    this.eventBus.publish(new ResourceDeletedEvent(this.resourceClassName, resourceId.toString(), user));
    this.notify(resourceId.toString(), 'delete', user, {});
    return deletedResource;
  }

  async getDocument<D>(grant: JwtPayload, resourceId: string, documentId: string): Promise<D> {
    return this.resourceQueryService._getResourceById<D>(this.resourceClassName, new ObjectId(resourceId), [
      `documents.${documentId}`,
    ]);
  }

  async download(
    grant: JwtPayload,
    resourceId: ObjectId,
    sectionName: string,
    documentId: string,
  ): Promise<{ stream: Readable; document: StoredFile }> {
    const allowGet = this.apiDef.get.let;
    const resource = await this.accessResource(grant, resourceId);
    const actualUserRoles = this.getActualUserRoles(this.getUserGroups(grant), allowGet);
    await grantGetResourceAccess(this.resourceClassName, actualUserRoles, resource);

    const documents = resource[sectionName];
    if (!documents) {
      throw new NotFoundException(`Document ${documentId} not found in ${this.resourceClassName} ${resourceId}`);
    }

    const document: StoredFile = Array.isArray(documents)
      ? documents.find((doc) => doc.hash256.slice(0, 20) === documentId)
      : documents;

    if (document && document.file) {
      return {
        stream: await this.storage.getFile(document),
        document,
      };
    }
    throw new NotFoundException();
  }

  async handleFileUpload(resourceId: ObjectId, sectionName: string, file: FileUpload, checkIfIsPresent?: boolean) {
    // TODO check if file exist
    const { buffer, ...fileParam } = file;
    const hash256 = createHash('sha256').update(buffer).digest('hex');
    const hashMd5 = createHash('md5').update(buffer).digest('hex');
    // we use hash256 as id to avoid collisions and allow file renaming
    const fileId = hash256.slice(0, 20);
    const key = `${this.resourceClassName}/${resourceId}/${sectionName}/file/${fileId}`;
    const fileDoc = {
      file: fileParam,
      key,
      hash256,
      hashMd5,
      createdAt: new Date(),
      updatedAt: new Date(),
      // pageCount: file.mimetype === 'application/pdf' ? await this.storage.countPDFPages(file.buffer) : 0,
    };
    if (checkIfIsPresent && this.storage.getFile(fileDoc)) {
      throw new BadRequestException(`File ${file.originalname} already exists at ${key}`);
    }
    this.storage.writeFile(fileDoc, buffer);
    // const storedFile = await this.storage.checkFileExists(fileDoc.key);
    // if (!storedFile) {
    //   throw new BadRequestException(`File ${file.originalname} failed to be stored`);
    // }
    this.eventBus.publish(new FileUploadedEvent({ ...fileDoc.file, buffer }, key));
    return fileDoc;
  }

  private getOperationAccess<ApiOperation>(operation: ApiOperation, sectionName: string) {
    try {
      return this.apiDef.sections[sectionName][operation].let;
    } catch (e) {
      throw Error(`Api "${operation}" "${sectionName}" endpoint not defined`);
    }
  }

  async uploadFile(
    grant: JwtPayload,
    operation: ApiOperation,
    resourceId: ObjectId,
    sectionName?: string,
    file?: FileUpload,
    payload?: DocumentMetadataDTO,
  ) {
    if (!file && !payload) {
      throw new BadRequestException('No file provided');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { path, ...updatedData } = payload;
    const resource = await this.accessResourceModifySection(grant, operation, resourceId, sectionName);

    const savedFile = await this.handleFileUpload(resourceId, sectionName, file);
    const fileDoc = {
      //...doc,
      ...updatedData,
      ...savedFile,
      ...(operation === 'create' ? { createdAt: new Date() } : { updatedAt: new Date() }),
    };

    try {
      return await this.doUpsertSection(grant, operation, sectionName, resource, fileDoc);
    } catch (e) {
      try {
        await this.storage.deleteFile(savedFile);
      } catch (e) {
        this.logger.info(`Error deleting file ${savedFile.key} after error ${e}`);
      }
      throw e;
    }
  }

  async doUpsertSection(grant: JwtPayload, operation: ApiOperation, sectionName: string, resource, payload) {
    const validationSectionScheme = this.apiDef.sections[sectionName][operation].validate ?? `${sectionName}.section`;
    this.validate(validationSectionScheme, payload);

    _.set(resource, sectionName, payload);
    // apply set action if defined
    if ('set' in this.apiDef.sections[sectionName][operation]) {
      const set = this.apiDef.sections[sectionName][operation].set;
      if (set) {
        for (const [key, value] of Object.entries(set)) {
          if ('isApproved' in payload) {
            if (payload.isApproved) {
              _.set(resource, key, value);
            }
            _.set(resource, `${sectionName}.createdAt`, new Date());
            _.set(resource, `${sectionName}.createdByAuthId`, grant.sub);
          } else {
            _.set(resource, key, value);
          }
        }
      }
    }
    // we validate whole resource in any case
    this.validate(this.apiDef.resourceSchemeName, resource);

    // Coerce data to please MongoDB
    const preparedData = {
      ...this.prepare4mongo(this.resourceClassName, resource, sectionName),
    };

    // return this._updateOne(resourceClassName, resourceId, { [`documents.${documentId}`]: data });
    const updatedResource = await this.resourceQueryService._updateOne<Document>(
      this.resourceClassName,
      resource._id,
      preparedData,
    );

    const user = this.getUser(grant);
    this.eventBus.publish(
      new ResourceUpdatedEvent(this.resourceClassName, operation, payload, resource, grant, user, sectionName),
    );
    this.notify(resource.id.toString(), 'update', user, preparedData, sectionName);
    return updatedResource.value;
  }

  async uploadFiles(
    grant: JwtPayload,
    operation: ApiOperation,
    resourceId: ObjectId,
    sectionName?: string,
    files?: FileUpload[],
    data?: DocumentMetadataDTO,
  ) {
    if (!files && Object.keys(data).length === 0) {
      throw new BadRequestException('No file provided');
    }

    const resource = await this.accessResourceModifySection(grant, operation, resourceId, sectionName);

    const storedFiles = await Promise.all(
      files.map((file) => this.handleFileUpload(resourceId, sectionName, file, operation === 'update')),
    );

    const fileDocs = storedFiles.map((storedFile) => ({
      ...storedFile,
      ...(operation === 'update' && { updatedAt: new Date() }),
    }));

    try {
      return await this.doUpsertSection(grant, operation, sectionName, resource, fileDocs);
    } catch (e) {
      this.logger.error(`Error uploading files ${e}`);
      await Promise.all(storedFiles.map((savedFile) => this.storage.deleteFile(savedFile)));
      throw e;
    }
  }

  async getSectionDocument(grant: JwtPayload, resourceId: string, sectionName: string, documentId: string) {
    return this.resourceQueryService._getResourceById(this.resourceClassName, new ObjectId(resourceId), [
      `${sectionName}.${documentId}`,
    ]);
  }

  prepare4mongo = (resourceClassName: string, data: any, sectionName?: string) => {
    // https://thabo-ambrose.medium.com/use-custom-date-time-format-for-ajv-schema-validation-38e336dbd6ed
    const dateFields = this.apiDef.coerceFields?.date;

    // TODO it does not work for nested arrays
    dateFields &&
      dateFields.forEach((fieldPath: string) => {
        // removes section name form fieldpath
        fieldPath = sectionName ? fieldPath.replace(`${sectionName}.`, '') : fieldPath;
        const date = _.get(data, fieldPath);
        if (date) {
          _.set(data, fieldPath, new Date(date));
        }
      });
    return data;
  };

  async accessResource<D>(
    grant: JwtPayload,
    resourceId: ObjectId,
    // excludeSections: string[],
    options?: FindOptions<any>,
  ): Promise<D> {
    return await this.resourceQueryService.accessResource<D>(grant, this.resourceClassName, resourceId, options);
  }

  async deleteDocument(grant: JwtPayload, resourceId: ObjectId, sectionName: string, fileId: string) {
    const resource = await this.accessResourceModifySection(grant, 'delete', resourceId, sectionName);
    const currentDocuments: StoredFile[] = resource[sectionName] || [];
    const documentToDelete = currentDocuments.filter((doc) => doc.hash256.slice(0, 20) === fileId);
    if (documentToDelete.length === 0) {
      throw new NotFoundException(`Document with id ${fileId} not found`);
    }
    const remainingDocuments = currentDocuments.filter((doc) => doc.hash256.slice(0, 20) !== fileId);
    const isVersioned = this.apiDef.sections[sectionName].versioned;
    if (!isVersioned) {
      await this.storage.deleteFile(documentToDelete[0]);
    }
    return await this.doUpsertSection(grant, 'update', sectionName, resource, remainingDocuments);
  }

  async deleteSection(grant: JwtPayload, resourceId: ObjectId, sectionName: string) {
    const resource = await this.accessResourceModifySection(grant, 'delete', resourceId, sectionName);
    const isVersioned = this.apiDef.sections[sectionName].versioned;
    const hasDocument = this.apiDef.sections[sectionName].document;
    const hasDocuments = this.apiDef.sections[sectionName].documents;

    if (!isVersioned && hasDocument) {
      const section: StoredFile = resource[sectionName];
      await this.storage.deleteFile(section);
    }
    if (!isVersioned && hasDocuments) {
      const section: StoredFile[] = resource[sectionName];
      section.forEach(async (storedDocument) => await this.storage.deleteFile(storedDocument));
    }
    return await this.doUpsertSection(grant, 'update', sectionName, resource, null);
  }

  async notify(
    resourceId: string,
    operation: ApiOperation,
    actor: User,
    diff: Partial<Resource>,
    sectionName?: string,
  ) {
    //  we don't want to send file
    if ((diff as any).file) {
      delete (diff as any).file;
    }
    const timestamp = new Date().getTime().toString();
    const data: SseMsg<Resource> = { timestamp, operation, diff, actor, sectionName };
    this.emitter.emit(resourceId, { data });
  }

  async subscribe<D>(grant: JwtPayload, resourceId: ObjectId): Promise<Observable<D>> {
    // we use same permissions as for get
    const allow = this.apiDef.get.let;
    const resource = await this.accessResource<D>(grant, resourceId);
    const actualUserRoles = this.getActualUserRoles(this.getUserGroups(grant), allow);
    await grantGetResourceAccess(this.resourceClassName, actualUserRoles, resource);

    return fromEvent<D>(this.emitter, resourceId.toString());
  }
}

// Boilerplate for creating a new resource service extending ResourceBaseService
// export class CollateralService extends ResourceBaseService {
//   constructor(
//     @InjectConnection() readonly connection: Connection,
//     @Inject('RESOURCE_NAME') readonly resourceClassName: string,
//     @Inject('API_DEF') readonly apiDef: Record<string, any>,
//     // @Inject('VALIDATOR') readonly validator: Record<string, any>,
//     readonly eventBus: EventBus,
//     @Inject(ConfigService) readonly conf: ConfigService,
//     readonly storage: StorageService,
//     @Inject(ResourceQueryService) readonly resourceQueryService: ResourceQueryService,
//     @InjectPinoLogger(CollateralService.name) readonly logger: PinoLogger,
//   ) {
//     super(connection, resourceClassName, apiDef, eventBus, storage, conf, resourceQueryService, logger);
//   }
// }
