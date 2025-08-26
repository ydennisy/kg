#!/usr/bin/env node

import { readFileSync, writeFileSync, chmodSync } from 'fs';
import { join } from 'path';

const MAIN_JS_PATH = join(process.cwd(), 'dist', 'main.js');
const SHEBANG = '#!/usr/bin/env node\n';

try {
  // Read the existing content
  const content = readFileSync(MAIN_JS_PATH, 'utf8');
  
  // Check if shebang already exists
  if (!content.startsWith('#!')) {
    // Prepend shebang to the file
    const newContent = SHEBANG + content;
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
} catch (error) {
  console.error('❌ Error in post-build script:', error.message);
  process.exit(1);
}