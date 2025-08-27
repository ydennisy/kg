import { LibsqlError } from '@libsql/client';
import { DuplicateUrlError } from '../../domain/errors/node-errors.js';

class RepositoryErrorTranslator {
  static translate(error: unknown): Error {
    if (error instanceof LibsqlError) {
      return this.translateLibsqlError(error);
    }
    if (error instanceof Error) {
      return error;
    }

    return new Error('An unexpected error occurred');
  }

  private static translateLibsqlError(error: LibsqlError): Error {
    // Check for unique constraint violations
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // Parse the error message to determine which constraint
      if (error.message.includes('link_nodes_url_unique')) {
        // Extract URL from error message if possible
        const urlMatch = error.message.match(/url=([^\s]+)/);
        const url = urlMatch?.[1] || 'unknown';
        return new DuplicateUrlError(url);
      }
    }

    // Default to wrapping in a generic error
    return new Error(`Database error: ${error.message}`);
  }
}

export { RepositoryErrorTranslator };
