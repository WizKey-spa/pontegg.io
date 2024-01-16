import { ObjectId } from 'mongodb';
import { Response } from 'express';
import { pipeline } from 'stream';
import {
  Controller,
  Get,
  Post,
  Param,
  Inject,
  Body,
  Put,
  Type,
  Delete,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Res,
  UploadedFiles,
} from '@nestjs/common';
import { ApiResponse, ApiOperation, ApiQuery, ApiBearerAuth, ApiConsumes, ApiBody, ApiTags } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

import ResourceBaseService from './resource.service';
import { Jwt } from '../auth/decorators/jwt.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { objId } from '../lib/parse-obj-id';
import { CursorDTO } from '../lib/common.dto';
import { DocumentMetadataDTO } from './document.dto';

import { Actor, JwtPayload } from '@Types/auth';
import { FileUpload } from '@Types/document';
import API, { Let, Section } from '@Types/api';

type ResponseWithHeader = Response & { header: any; status: any };

export const MAX_FILE_SIZE = 100 * 1024 * 1024;
export const FILES_QUANTITY = 20;

export const getRoles = (action: { let?: Let<any, any> }) => {
  return (
    action?.let?.map((role) => {
      return typeof role === 'string' ? role : role.for;
    }) || []
  );
};

export function getControllerClass<Document>(resourceClassName: string, apiDef: API<any, Document>): Type<any>[] {
  const responseScheme = { ...apiDef.scheme, properties: { _id: { type: 'string' }, ...apiDef.scheme.properties } };
  const sectionNames = Object.keys(apiDef.sections);
  const sectionNamesWithDocuments = sectionNames.filter((sectionName) => apiDef.sections[sectionName].documents);
  const sectionNamesWithDocument = sectionNames.filter((sectionName) => apiDef.sections[sectionName].document);
  const sectionNamesWithCreate = sectionNames.filter(
    (sectionName) =>
      apiDef.sections[sectionName].create &&
      ![...sectionNamesWithDocuments, ...sectionNamesWithDocument].includes(sectionName),
  );
  const sectionNamesWithUpdate = sectionNames.filter(
    (sectionName) =>
      apiDef.sections[sectionName].update &&
      ![...sectionNamesWithDocuments, ...sectionNamesWithDocument].includes(sectionName),
  );
  const sectionNamesWithDelete = sectionNames.filter(
    (sectionName) =>
      apiDef.sections[sectionName].delete &&
      ![...sectionNamesWithDocuments, ...sectionNamesWithDocument].includes(sectionName),
  );
  const sectionNamesWithDocumentCreate = sectionNames.filter(
    (sectionName) => apiDef.sections[sectionName].document && apiDef.sections[sectionName].create,
  );
  const sectionNamesWithDocumentUpdate = sectionNames.filter(
    (sectionName) => apiDef.sections[sectionName].document && apiDef.sections[sectionName].update,
  );
  const sectionNamesWithDocumentsCreate = sectionNames.filter(
    (sectionName) => apiDef.sections[sectionName].documents && apiDef.sections[sectionName].create,
  );
  const sectionNamesWithDocumentsUpdate = sectionNames.filter(
    (sectionName) => apiDef.sections[sectionName].documents && apiDef.sections[sectionName].update,
  );
  const sectionNamesWithDocumentsDelete = sectionNames.filter(
    (sectionName) => apiDef.sections[sectionName].documents && apiDef.sections[sectionName].delete,
  );
  @ApiBearerAuth()
  @Controller(resourceClassName)
  @ApiTags(resourceClassName)
  class ResourceController {
    constructor(
      // @Inject('RESOURCE_NAME') resourceClassName: string,
      @Inject('RESOURCE_SERVICE') private readonly resourceService: ResourceBaseService,
    ) {}

    @Post('')
    @Roles(getRoles(apiDef.create))
    @UseGuards(RolesGuard)
    @ApiResponse({
      status: 201,
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    })
    @ApiBody({
      schema: apiDef.scheme as any,
    })
    // @ApiCreatedResponse({ schema: apiDef.scheme })
    @ApiOperation({ summary: `creates ${resourceClassName}` })
    async create(@Jwt() grant: JwtPayload, @Body() data: any) {
      return this.resourceService.create<Document>(grant, data);
    }

    @Get('/')
    @Roles(getRoles(apiDef.list))
    @UseGuards(RolesGuard)
    @ApiResponse({
      status: 200,
      schema: {
        type: 'object',
        properties: {
          items: { type: 'array', items: responseScheme },
          cursor: { type: 'object' },
          hasMore: { type: 'boolean' },
        },
      },
    })
    // @ApiQuery({ name: 'limit', type: 'number', required: false })
    // @ApiQuery({ name: 'from', type: 'string', required: false })
    // @ApiQuery({ name: 'state', type: 'string', enum: apiDef.states, required: false })
    // @ApiQuery({ name: 'field', type: 'string', enum: apiDef.list.query, required: false })
    @ApiOperation({ summary: `gets list of ${resourceClassName}` })
    list(@Jwt() grant: JwtPayload) {
      const cursor = new CursorDTO();
      return this.resourceService.list<Document>(grant, cursor);
    }

    @Get(':Id')
    @Roles(getRoles(apiDef.get))
    @UseGuards(RolesGuard)
    @ApiQuery({ name: 'Id', type: 'string', required: true })
    @ApiResponse({
      status: 200,
      schema: responseScheme,
    })
    // @ApiOkResponse({ schema: responseScheme })
    @ApiOperation({ summary: `gets ${resourceClassName} data` })
    get(@Jwt() grant: JwtPayload, @Param('Id', objId) Id: ObjectId) {
      return this.resourceService.get<Document>(grant, Id);
    }

    @Delete(':Id')
    @Roles(getRoles(apiDef.delete))
    @UseGuards(RolesGuard)
    @ApiQuery({ name: 'Id', type: 'string', required: true })
    @ApiResponse({ status: 200 })
    @ApiOperation({ summary: `deletes ${resourceClassName}` })
    delete(@Jwt() grant: JwtPayload, @Param('Id', objId) Id: ObjectId) {
      return this.resourceService.delete(grant, Id);
    }

    @Put(':Id')
    @ApiQuery({ name: 'Id', type: 'string', required: true })
    @Roles(getRoles(apiDef.update))
    @UseGuards(RolesGuard)
    @ApiResponse({
      status: 201,
      schema: responseScheme,
    })
    @ApiBody({
      schema: apiDef.scheme as any,
    })
    @ApiOperation({ summary: `updates ${resourceClassName}'s data` })
    async update(@Param('Id', objId) Id: ObjectId, @Jwt() grant: JwtPayload, @Body() data: any) {
      return this.resourceService.update<Document>(grant, Id, data);
    }

    // @Get(':Id/:sectionName')
    // @ApiQuery({ name: 'Id', type: 'string', required: true })
    // @ApiQuery({ name: 'sectionName', type: 'string', enum: sectionNames, required: true })
    // @ApiResponse({ status: 200 })
    // @Roles(getRoles(apiDef.get))
    // @UseGuards(RolesGuard)
    // @ApiOperation({ summary: `retrieves ${resourceClassName}'s section` })
    // getSection(@Jwt() grant: JwtPayload, @Param('Id', objId) Id: ObjectId, @Param('sectionName') sectionName: string) {
    //   return this.resourceService.getSection(grant, Id, sectionName);
    // }

    @Post(':Id/:sectionName')
    @ApiQuery({ name: 'Id', type: 'string', required: true })
    @ApiQuery({
      name: 'sectionName',
      type: 'string',
      enum: sectionNamesWithCreate,
      required: true,
    })
    @UseGuards(RolesGuard)
    @ApiResponse({
      status: 201,
      schema: responseScheme,
    })
    @ApiOperation({
      summary: `creates ${resourceClassName}'s section`,
      description: `depending on the section (and user group), payload will be different:

${sectionNames
  .map(
    (sectionName) => `- *${sectionName}*:
\`\`\`
${JSON.stringify(apiDef.scheme.properties[sectionName], null, 2)}
\`\`\`
`,
  )
  .join('')}
      `,
    })
    async insertSection(
      @Param('Id', objId) Id: ObjectId,
      @Param('sectionName') sectionName: string,
      @Jwt() grant: JwtPayload,
      @Body() data: any,
    ) {
      return this.resourceService.upsertSection<Document>(grant, 'create', Id, sectionName, data);
    }

    @Put(':Id/:sectionName')
    @ApiQuery({ name: 'Id', type: 'string', required: true })
    @ApiQuery({ name: 'sectionName', type: 'string', enum: sectionNamesWithUpdate, required: true })
    @UseGuards(RolesGuard)
    @ApiResponse({
      status: 200,
      schema: responseScheme,
    })
    @ApiOperation({ summary: `updates ${resourceClassName}'s section` })
    async updateSection(
      @Jwt() grant: JwtPayload,
      @Param('Id', objId) Id: ObjectId,
      @Param('sectionName') sectionName: string,
      @Body() data: any,
    ) {
      return this.resourceService.upsertSection<Document>(grant, 'update', Id, sectionName, data);
    }

    // Documents endpoints
    @Get(':Id/:sectionName/file/:documentId')
    @ApiQuery({ name: 'Id', type: 'string', required: true })
    @ApiQuery({ name: 'documentId', type: 'string', required: true })
    @ApiQuery({ name: 'sectionName', type: 'string', enum: sectionNamesWithDocument, required: true })
    @ApiResponse({ status: 201 })
    @Roles(getRoles(apiDef.get))
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: `get ${resourceClassName}'s document file` })
    // @ApiProperty({ type: 'file' })
    async download(
      @Jwt() grant: JwtPayload,
      @Param('Id', objId) Id: ObjectId,
      @Param('sectionName') sectionName: string,
      @Param('documentId') documentId: string,
      @Res() res: ResponseWithHeader, // & { header: any; status: any }
    ) {
      const { stream, document } = await this.resourceService.download(grant, Id, sectionName, documentId);
      res.header('Content-type', document.file.mimetype);
      res.header('Content-MD5', document.hashMd5);
      return pipeline(stream, res as any, (err) => {
        if (err) {
          res.status(500).send(err.message);
        }
      });
      return res;
    }

    @UseInterceptors(
      FileInterceptor('file', {
        limits: { fileSize: MAX_FILE_SIZE },
      }),
    )
    @Post(':Id/:sectionName/document')
    @ApiQuery({ name: 'Id', type: 'string', required: true })
    @ApiQuery({ name: 'sectionName', type: 'string', enum: sectionNamesWithDocumentCreate, required: true })
    @ApiQuery({ name: 'file', type: 'file', required: true })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({
      status: 201,
      schema: responseScheme,
    })
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: `uploads ${resourceClassName}'s document/file max: ${MAX_FILE_SIZE / 10000}MB` })
    async createDocument(
      @Jwt() grant: JwtPayload,
      @Param('Id', objId) Id: ObjectId,
      @Param('sectionName') sectionName: string,
      @UploadedFile() file: FileUpload,
      @Body() data: DocumentMetadataDTO,
    ) {
      return this.resourceService.uploadFile(grant, 'create', Id, sectionName, file, data);
    }

    @UseInterceptors(FilesInterceptor('files', FILES_QUANTITY, { limits: { fileSize: MAX_FILE_SIZE } }))
    @Post(':Id/:sectionName/documents')
    @ApiQuery({ name: 'Id', type: 'string', required: true })
    @ApiQuery({ name: 'sectionName', type: 'string', enum: sectionNamesWithDocumentsCreate, required: true })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({
      status: 201,
      schema: responseScheme,
    })
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: `uploads multiple files to ${resourceClassName} section` })
    async createDocuments(
      @Jwt() grant: JwtPayload,
      @Param('Id', objId) Id: ObjectId,
      @Param('sectionName') sectionName: string,
      @UploadedFiles() files: FileUpload[],
      @Body() data: DocumentMetadataDTO,
    ) {
      return this.resourceService.uploadFiles(grant, 'create', Id, sectionName, files, data);
    }

    @UseInterceptors(FilesInterceptor('files', FILES_QUANTITY, { limits: { fileSize: MAX_FILE_SIZE } }))
    @Put(':Id/:sectionName/documents')
    @ApiQuery({ name: 'Id', type: 'string', required: true })
    @ApiQuery({ name: 'sectionName', type: 'string', enum: sectionNamesWithDocumentsUpdate, required: true })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({
      status: 201,
      schema: responseScheme,
    })
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: `uploads (update) multiple files to ${resourceClassName} section` })
    async updateDocuments(
      @Jwt() grant: JwtPayload,
      @Param('Id', objId) Id: ObjectId,
      @Param('sectionName') sectionName: string,
      @UploadedFiles() files: FileUpload[],
      @Body() data: DocumentMetadataDTO,
    ) {
      return this.resourceService.uploadFiles(grant, 'update', Id, sectionName, files, data);
    }

    @Delete(':Id/:sectionName/documents/:fileId')
    @ApiQuery({ name: 'Id', type: 'string', required: true })
    @ApiQuery({ name: 'sectionName', type: 'string', enum: sectionNamesWithDocumentsDelete, required: true })
    @ApiQuery({ name: 'fileId', type: 'string', required: true })
    @ApiResponse({
      status: 201,
      schema: responseScheme,
    })
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: `deletes multiple documents at ${resourceClassName} section` })
    async deleteDocument(
      @Jwt() grant: JwtPayload,
      @Param('Id', objId) Id: ObjectId,
      @Param('sectionName') sectionName: string,
      @Param('fileId') fileId: string,
    ) {
      return this.resourceService.deleteDocument(grant, Id, sectionName, fileId);
    }

    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
    @Put(':Id/:sectionName/document')
    @ApiQuery({ name: 'Id', type: 'string', required: true })
    @ApiQuery({ name: 'sectionName', type: 'string', enum: sectionNamesWithDocumentUpdate, required: true })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({
      status: 200,
      schema: responseScheme,
    })
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: `updates  ${resourceClassName}'s section file` })
    async updateDocument(
      @Jwt() grant: JwtPayload,
      @Param('Id', objId) Id: ObjectId,
      @Param('sectionName') sectionName: string,
      @UploadedFile() file: FileUpload,
      @Body() data: any,
    ) {
      return this.resourceService.uploadFile(grant, 'update', Id, sectionName, file, data);
    }

    @Delete(':Id/:sectionName')
    @ApiQuery({ name: 'Id', type: 'string', required: true })
    @ApiQuery({ name: 'sectionName', type: 'string', enum: sectionNamesWithDelete, required: true })
    @ApiResponse({
      status: 200,
      schema: responseScheme,
    })
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: `deletes  ${resourceClassName} section` })
    async deleteSection(
      @Jwt() grant: JwtPayload,
      @Param('Id', objId) Id: ObjectId,
      @Param('sectionName') sectionName: string,
    ) {
      return this.resourceService.deleteSection(grant, Id, sectionName);
    }
  }

  if (!apiDef.create) delete ResourceController.prototype.create;
  if (!apiDef.update) delete ResourceController.prototype.update;
  if (!apiDef.delete) delete ResourceController.prototype.delete;
  if (!apiDef.list) delete ResourceController.prototype.list;

  const hasDocument = Object.values(apiDef.sections)?.some((section) => (section as Section<Actor, any>)?.document);
  const hasDocuments = Object.values(apiDef.sections)?.some((section) => (section as Section<Actor, any>)?.documents);
  const anySectionDeletable = Object.values(apiDef.sections)?.some(
    (section) => (section as Section<Actor, any>)?.delete,
  );

  if (!hasDocument) {
    delete ResourceController.prototype.createDocument;
    delete ResourceController.prototype.updateDocument;
  }
  if (!hasDocuments) {
    delete ResourceController.prototype.createDocuments;
    delete ResourceController.prototype.updateDocuments;
    delete ResourceController.prototype.deleteDocument;
  }
  if (!hasDocument && !hasDocuments) {
    delete ResourceController.prototype.download;
  }
  if (!anySectionDeletable) {
    delete ResourceController.prototype.deleteSection;
  }
  if (sectionNamesWithDelete.length === 0) {
    delete ResourceController.prototype.deleteSection;
  }
  return [ResourceController];
}
