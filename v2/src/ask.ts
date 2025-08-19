import ollama from 'ollama';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { parseFrontmatter } from './frontmatter.js';

// Get query from command line arguments
const query = process.argv[2];

if (!query) {
  console.error('❌ Please provide a query as an argument');
  console.log('💡 Usage: npm run ask "What is a Dyson sphere?"');
  process.exit(1);
}

console.log(`🤔 Processing query: "${query}"`);

// Storage for different node types
const tagNodes: Array<{
  title: string;
  id: string;
}> = [];

const relevantNotes: Array<{
  filename: string;
  title: string;
  content: string;
  reason: string;
  score: number;
}> = [];

// Tool to mark notes as relevant
function markRelevant(filename: string, reason: string, score: number): string {
  // We'll need the file content later, so we'll store it when we find it
  return `Marked "${filename}" as relevant (score: ${score}/10)`;
}

// Tool definition for relevance marking
const tools = [
  {
    type: 'function',
    function: {
      name: 'mark_relevant',
      description: 'Mark a note file as relevant to the user query',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'The name of the file being evaluated',
          },
          reason: {
            type: 'string',
            description: 'Brief explanation of why this note is relevant to the query',
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
function executeTool(name: string, parameters: any, currentFileData?: any): string {
  switch (name) {
    case 'mark_relevant':
      // Store the relevant note with its content for later use
      if (currentFileData) {
        relevantNotes.push({
          filename: parameters.filename,
          title: currentFileData.title,
          content: currentFileData.body,
          reason: parameters.reason,
          score: parameters.score,
        });
      }
      return markRelevant(parameters.filename, parameters.reason, parameters.score);
    default:
      return `Unknown tool: ${name}`;
  }
}

// Main ask function
async function askKnowledgeGraph() {
  const nodesDir = join(process.cwd(), '.kg', 'nodes');

  try {
    // Read all markdown files in the nodes directory
    const files = await readdir(nodesDir);
    const markdownFiles = files.filter((file) => file.endsWith('.md'));

    if (markdownFiles.length === 0) {
      console.log('📁 No markdown files found in .kg/nodes/ directory');
      return;
    }

    // Phase 1: Analyze nodes and collect tags/relevant notes
    console.log(`\n📊 Analyzing ${markdownFiles.length} knowledge nodes...`);

    for (const filename of markdownFiles) {
      try {
        const filePath = join(nodesDir, filename);
        const fileContent = await readFile(filePath, 'utf-8');
        const parsed = parseFrontmatter(fileContent);

        const { title = 'Untitled', type = 'note', id } = parsed.attributes;

        if (type === 'tag') {
          // Collect tag nodes for context
          tagNodes.push({ title, id });
        } else if (type === 'note') {
          // Analyze note relevance using the model
          const messages = [
            {
              role: 'user',
              content: `Query: "${query}"
              
File: ${filename}
Title: ${title}
Content:
${parsed.body}

Please analyze if this note content is relevant to the user query. If it is relevant, call the mark_relevant tool with the filename, a brief reason for relevance, and a relevance score (1-10). If not relevant, just respond that it's not relevant.`,
            },
          ];

          // Get model response
          let response = await ollama.chat({
            model: 'gpt-oss:20b',
            messages: messages,
            think: 'low',
            tools: tools,
          });

          // Handle tool calls
          while (
            response.message.tool_calls &&
            response.message.tool_calls.length > 0
          ) {
            messages.push(response.message);

            for (const toolCall of response.message.tool_calls) {
              const name = toolCall.function?.name;
              const parameters = toolCall.function?.arguments || {};
              const result = executeTool(name, parameters, {
                title,
                body: parsed.body,
              });

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
          if (response.message.content && !response.message.tool_calls) {
            // Only log if it's not relevant (when relevant, tool call handles the output)
            if (!response.message.content.toLowerCase().includes('relevant')) {
              console.log(`   💭 ${filename}: ${response.message.content}`);
            }
          }
        }
      } catch (err) {
        console.error(`   ❌ Error processing ${filename}: ${err}`);
      }
    }

    // Phase 2: Generate answer using relevant content
    await generateAnswer();

  } catch (err) {
    console.error(`❌ Error accessing nodes directory: ${err}`);
    console.log('💡 Make sure the .kg/nodes/ directory exists with some .md files');
  }
}

async function generateAnswer() {
  // Show what we found
  if (tagNodes.length > 0) {
    console.log(`\n📊 Found ${tagNodes.length} tag(s) indicating user interests:`);
    tagNodes.forEach(tag => console.log(`   - ${tag.title}`));
  }

  if (relevantNotes.length === 0) {
    console.log('\n❌ No relevant notes found to answer the query.');
    return;
  }

  // Sort by relevance score
  relevantNotes.sort((a, b) => b.score - a.score);

  console.log(`\n🎯 Generating answer based on ${relevantNotes.length} relevant source(s):`);

  // Build context for the final answer
  let contextText = `User Query: "${query}"\n\n`;

  if (tagNodes.length > 0) {
    contextText += `User Interests (based on their tags):\n`;
    tagNodes.forEach(tag => contextText += `- ${tag.title}\n`);
    contextText += '\n';
  }

  contextText += `Relevant Knowledge:\n\n`;

  // Add top relevant notes (limit to prevent token overflow)
  const maxNotes = 5; // Limit to top 5 most relevant
  const topNotes = relevantNotes.slice(0, maxNotes);

  topNotes.forEach((note, index) => {
    contextText += `Source ${index + 1}: ${note.title} (Relevance: ${note.score}/10)\n`;
    contextText += `${note.content}\n\n`;
  });

  contextText += `Please provide a comprehensive answer to the user's query using the above knowledge. Be specific and reference the relevant information from the sources when appropriate.`;

  // Generate the final answer
  const response = await ollama.chat({
    model: 'gpt-oss:20b',
    messages: [
      {
        role: 'user',
        content: contextText,
      },
    ],
    think: 'low',
  });

  console.log('\n' + '='.repeat(50));
  console.log('📝 ANSWER:');
  console.log('='.repeat(50));
  console.log(response.message.content);

  // Show sources
  console.log('\n' + '📚 SOURCES:');
  topNotes.forEach((note, index) => {
    console.log(`${index + 1}. ${note.title} (Score: ${note.score}/10)`);
    console.log(`   Reason: ${note.reason}`);
  });
}

// Run the ask function
askKnowledgeGraph().catch(console.error);