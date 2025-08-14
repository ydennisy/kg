// A simplified JSONSchema required for this app
interface JSONSchema {
  type?:
    | 'string'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'object'
    | 'array'
    | 'null';
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<string>;
}

interface Validator {
  validate: (schema: JSONSchema, data: unknown) => ValidationResult;
}

export type { Validator, JSONSchema };
