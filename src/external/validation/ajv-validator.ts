import { Ajv } from 'ajv';
import type { Validator, JSONSchema } from '../../domain/ports/validator.js';

class AjvValidator implements Validator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  public validate(schema: JSONSchema, data: unknown) {
    const validator = this.ajv.compile(schema);
    const isValid = validator(data);
    const errors = validator.errors || [];
    // TODO: pass errors as the structured version
    return { isValid, errors: errors.map((e) => e.message || 'unknown error') };
  }
}

export { AjvValidator };
