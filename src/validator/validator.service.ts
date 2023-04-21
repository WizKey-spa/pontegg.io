import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Ajv from 'ajv';

import { setValidator } from '../lib/validator';

type Validators = Record<string, Ajv>;

@Injectable()
export class ValidatorService {
  public validators: Validators;
  constructor(private readonly config: ConfigService) {
    const schemesDir = this.config.get('SCHEMES_DIR');
    const resourcesNames = this.config.get('SUPPORTED_RESOURCES').split(',');
    (async () => {
      this.validators = Object.fromEntries(
        await Promise.all(
          resourcesNames.map(async (resourceName) => [resourceName, await setValidator(schemesDir, resourceName)]),
        ),
      );
    })();
  }

  getValidator(resourceName: string): Ajv {
    return this.validators[resourceName];
  }
}
