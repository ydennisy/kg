#!/usr/bin/env tsx

import { readFileSync, writeFileSync, chmodSync } from 'fs';
import { join } from 'path';

const MAIN_JS_PATH = join(process.cwd(), 'dist', 'main.js');
const SHEBANG = '#!/usr/bin/env node\n';

try {
  // Read the existing content
  const content: string = readFileSync(MAIN_JS_PATH, 'utf8');

  // Check if shebang already exists
  if (!content.startsWith('#!')) {
    // Prepend shebang to the file
    const newContent: string = SHEBANG + content;
    writeFileSync(MAIN_JS_PATH, newContent);
    console.log('✅ Added shebang to dist/main.js');
  } else {
    console.log('✅ Shebang already exists in dist/main.js');
  }

  // Make the file executable (Unix systems)
  if (process.platform !== 'win32') {
    chmodSync(MAIN_JS_PATH, 0o755);
    console.log('✅ Made dist/main.js executable');
  }
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error('❌ Error in post-build script:', errorMessage);
  process.exit(1);
}
