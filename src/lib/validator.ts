import { ResourceClassName } from '@Types/common';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export const setValidator = async (schemesDir, resourceClassName: ResourceClassName) => {
  // this.validator = resourceValidators[resourceClassName];
  const importAjv = new Ajv({ strictSchema: false, coerceTypes: true }); // removeAdditional: true
  addFormats(importAjv);
  const schemaPath = `${schemesDir}/${resourceClassName}`;
  try {
    const schemes = (await import(schemaPath))['schemes'];
    schemes.forEach(async ([schemaName, scheme]) => importAjv.addSchema(scheme, schemaName));
  } catch (e) {
    console.error((e as Error).message);
    // throw new Error((e as Error).message);
  }
  return importAjv;
};
