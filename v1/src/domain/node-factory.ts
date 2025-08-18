import { randomUUID } from 'node:crypto';
import { Node, type NodeType } from './node.js';
import type { Validator, JSONSchema } from './ports/validator.js';

class NodeFactory {
  private validator: Validator;
  private schemas: Map<string, JSONSchema>;

  constructor(validator: Validator) {
    this.validator = validator;
    this.schemas = new Map<string, JSONSchema>();
  }

  public registerSchema(type: NodeType, schema: JSONSchema) {
    this.schemas.set(type, schema);
  }

  public createNode<T extends Record<string, any>>(
    type: NodeType,
    data: T,
    tags: Array<string> = [],
    isPublic: boolean = false
  ): Node<T> {
    const schema = this.schemas.get(type);
    if (!schema) {
      throw new Error(`Schema of type: ${type} has not been registered`);
    }

    const { isValid, errors } = this.validator.validate(schema, data);
    if (!isValid) {
      throw new Error(
        `Invalid persisted data for type ${type}: ${errors.join(', ')}`
      );
    }

    const id = randomUUID();
    const now = new Date();
    const createdAt = now;
    const updatedAt = now;
    return new Node(id, type, createdAt, updatedAt, tags, isPublic, data);
  }

  public hydrateNode<T extends Record<string, any>>(
    id: string,
    type: NodeType,
    data: T,
    tags: string[],
    createdAt: Date,
    updatedAt: Date,
    isPublic: boolean = false
  ): Node<T> {
    const schema = this.schemas.get(type);
    if (!schema) {
      throw new Error(`Schema of type: ${type} has not been registered`);
    }

    // Validate when reconstructing from persistence
    const { isValid, errors } = this.validator.validate(schema, data);
    if (!isValid) {
      throw new Error(
        `Invalid persisted data for type ${type}: ${errors.join(', ')}`
      );
    }

    return new Node(id, type, createdAt, updatedAt, tags, isPublic, data);
  }
}

export { NodeFactory };
