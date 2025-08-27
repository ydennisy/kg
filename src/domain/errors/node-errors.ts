import { DomainError } from './base-error.js';

class NodeNotFoundError extends DomainError {
  readonly code = 'NODE_NOT_FOUND';

  constructor(public readonly nodeId: string) {
    super(`Node with id ${nodeId} not found`);
  }
}

class DuplicateUrlError extends DomainError {
  readonly code = 'DUPLICATE_URL';

  constructor(public readonly url: string) {
    super(`A node with URL ${url} already exists`);
  }
}

class InvalidNodeTypeError extends DomainError {
  readonly code = 'INVALID_NODE_TYPE';

  constructor(
    public readonly nodeType: string,
    public readonly operation: string
  ) {
    super(`Cannot perform ${operation} on node type ${nodeType}`);
  }
}

export { NodeNotFoundError, DuplicateUrlError, InvalidNodeTypeError };
