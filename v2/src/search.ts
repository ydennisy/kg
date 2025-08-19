import ollama from 'ollama';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

// Get query from command line arguments
const query = process.argv[2] || 'what is a dyson sphere?';
console.log(`🔍 Searching for: "${query}"`);

// Storage for relevant files
const relevantFiles: Array<{
  filename: string;
  reason: string;
  score: number;
}> = [];

// Tool to mark files as relevant
function markRelevant(filename: string, reason: string, score: number): string {
  relevantFiles.push({ filename, reason, score });
  return `Marked "${filename}" as relevant (score: ${score}/10)`;
}

// Tool definition for relevance marking
const tools = [
  {
    type: 'function',
    function: {
      name: 'mark_relevant',
      description: 'Mark a file as relevant to the search query',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'The name of the file being evaluated',
          },
          reason: {
            type: 'string',
            description:
              'Brief explanation of why this file is relevant to the query',
          },
          score: {
            type: 'number',
            description: 'Relevance score from 1-10 (10 being most relevant)',
          },
        },
        required: ['filename', 'reason', 'score'],
      },
    },
  },
];

// Function to execute tool calls
function executeTool(name: string, parameters: any): string {
  switch (name) {
    case 'mark_relevant':
      return markRelevant(
        parameters.filename,
        parameters.reason,
        parameters.score
      );
    default:
      return `Unknown tool: ${name}`;
  }
}

// Main search function
async function searchNodes() {
  const nodesDir = join(process.cwd(), 'nodes');

  try {
    // Read all markdown files in the nodes directory
    const files = await readdir(nodesDir);
    const markdownFiles = files.filter((file) => file.endsWith('.md'));

    if (markdownFiles.length === 0) {
      console.log('📁 No markdown files found in nodes/ directory');
      return;
    }

    console.log(
      `📚 Found ${markdownFiles.length} markdown files to analyze...\n`
    );

    // Process each file
    for (const filename of markdownFiles) {
      console.log(`📄 Analyzing: ${filename}`);

      try {
        const filePath = join(nodesDir, filename);
        const content = await readFile(filePath, 'utf-8');

        // Create messages for the model
        const messages = [
          {
            role: 'user',
            content: `Query: "${query}"
            
File: ${filename}
Content:
${content}

Please analyze if this file content is relevant to the search query. If it is relevant, call the mark_relevant tool with the filename, a brief reason for relevance, and a relevance score (1-10). If not relevant, just respond that it's not relevant.`,
          },
        ];

        // Get model response
        let response = await ollama.chat({
          model: 'gpt-oss:20b',
          messages: messages,
          think: 'low',
          tools: tools,
        });

        if (response.message.thinking) {
          console.log('THNKING: ', response.message.thinking);
        }

        // Handle tool calls
        while (
          response.message.tool_calls &&
          response.message.tool_calls.length > 0
        ) {
          messages.push(response.message);

          for (const toolCall of response.message.tool_calls) {
            const name = toolCall.function?.name;
            const parameters = toolCall.function?.arguments || {};
            const result = executeTool(name, parameters);

            console.log(`   ✅ ${result}`);

            messages.push({
              role: 'tool',
              content: result,
            });
          }

          response = await ollama.chat({
            model: 'gpt-oss:20b',
            messages: messages,
            tools: tools,
          });
        }

        // Show final response if no tool calls
        if (response.message.content) {
          console.log(`   💭 ${response.message.content}`);
        }
      } catch (err) {
        console.error(`   ❌ Error processing ${filename}: ${err}`);
      }

      console.log(); // Empty line for readability
    }

    // Display results
    console.log('🎯 SEARCH RESULTS');
    console.log('================');

    if (relevantFiles.length === 0) {
      console.log('No relevant files found for the query.');
    } else {
      console.log(`Found ${relevantFiles.length} relevant file(s):\n`);

      // Sort by relevance score (highest first)
      relevantFiles.sort((a, b) => b.score - a.score);

      relevantFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file.filename} (Score: ${file.score}/10)`);
        console.log(`   Reason: ${file.reason}\n`);
      });
    }
  } catch (err) {
    console.error(`❌ Error accessing nodes directory: ${err}`);
    console.log('💡 Make sure the nodes/ directory exists with some .md files');
  }
}

// Run the search
searchNodes().catch(console.error);
