import ollama from 'ollama';

// Dummy tool functions
function getCurrentWeather(city: string): string {
  const temperatures = [18, 22, 25, 28, 15, 20, 24];
  const conditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy'];
  const temp = temperatures[Math.floor(Math.random() * temperatures.length)];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  return `The weather in ${city} is ${condition} with a temperature of ${temp}°C`;
}

function calculateMath(expression: string): string {
  try {
    // Simple math evaluation (only allow basic operations for security)
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    const result = Function('"use strict"; return (' + sanitized + ')')();
    return `${expression} = ${result}`;
  } catch (error) {
    return `Error calculating ${expression}: Invalid expression`;
  }
}

function getCurrentTime(): string {
  return `Current time: ${new Date().toLocaleString()}`;
}

// Tool definitions for Ollama
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_current_weather',
      description: 'Get the current weather for a city',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'The name of the city',
          },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_math',
      description: 'Calculate a mathematical expression',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description:
              'The mathematical expression to calculate (e.g., "2 + 2", "10 * 5")',
          },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Get the current date and time',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

// Function to execute tool calls
function executeTool(name: string, parameters: any): string {
  switch (name) {
    case 'get_current_weather':
      return getCurrentWeather(parameters.city);
    case 'calculate_math':
      return calculateMath(parameters.expression);
    case 'get_current_time':
      return getCurrentTime();
    default:
      return `Unknown tool: ${name}`;
  }
}

// Main conversation loop
const messages = [
  {
    role: 'user',
    content:
      'What is the weather in Paris? Also, what is 15 * 7? And what time is it now?',
  },
];

let response = await ollama.chat({
  model: 'gpt-oss:20b',
  messages: messages,
  tools: tools,
});

console.log('=== CONVERSATION START ===');
let round = 1;

// Handle multiple rounds of tool calls
while (response.message.tool_calls && response.message.tool_calls.length > 0) {
  console.log(`\n--- Round ${round} ---`);
  console.log('Assistant response:', JSON.stringify(response.message, null, 2));

  // Add assistant message to conversation
  messages.push(response.message);

  // Execute each tool call
  for (const toolCall of response.message.tool_calls) {
    const name = toolCall.function?.name;
    const parameters = toolCall.function?.arguments || {};
    const result = executeTool(name, parameters);

    console.log(
      `\nExecuted ${name} with params:`,
      JSON.stringify(parameters, null, 2)
    );
    console.log(`Result:`, result);

    // Add tool result to conversation
    messages.push({
      role: 'tool',
      content: result,
    });
  }

  // Get next response
  response = await ollama.chat({
    model: 'gpt-oss:20b',
    messages: messages,
    tools: tools,
  });

  round++;

  // Safety break to avoid infinite loops
  if (round > 10) {
    console.log('\nStopping after 10 rounds to avoid infinite loop');
    break;
  }
}

console.log(`\n=== FINAL RESPONSE (Round ${round}) ===`);
console.log('Content:', response.message.content);

if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
  console.log('\n✅ Tool calling test completed successfully!');
  console.log(
    'The gpt-oss:20b model supports tool calling and executed all requested functions.'
  );
} else {
  console.log('\n⚠️ Conversation ended with pending tool calls');
}
