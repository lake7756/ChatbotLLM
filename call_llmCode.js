// Interactive chat using CopilotLLM imported from copilot_llm.js
// Usage: set GITHUB_TOKEN env var, then: node call_llm_minimal.js ["optional initial message"]

const readline = require('readline');
const { CopilotLLM, getCopilotTokenViaInternalEndpoint } = require('./copilot_llm.js');

async function main() {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error('Error: GITHUB_TOKEN environment variable not set');
      process.exit(1);
    }

    console.log('Getting Copilot token...');
    const copilotToken = await getCopilotTokenViaInternalEndpoint(githubToken);
    if (!copilotToken) {
      console.error('Failed to get Copilot token');
      process.exit(1);
    }

    const llm = new CopilotLLM(copilotToken);

    // conversation history preserved between turns
    const messages = [];

    // optional initial message from argv
    const initial = process.argv.slice(2).join(' ').trim();
    if (initial) {
      messages.push({ role: 'user', content: initial });
      console.log(`\nUser: ${initial}\n`);
      console.log('Waiting for LLM response...\n');
      const resp = await llm.invoke(messages);
      messages.push({ role: 'assistant', content: resp });
      console.log('Assistant:', resp, '\n');
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });

    console.log('Interactive conversation started. Type your question and press Enter. Type `exit` or `quit` to stop.');
    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) {
        rl.prompt();
        return;
      }
      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        rl.close();
        return;
      }

      messages.push({ role: 'user', content: input });
      console.log('Waiting for LLM response...');
      try {
        const answer = await llm.invoke(messages);
        messages.push({ role: 'assistant', content: answer });
        console.log('\nAssistant:', answer, '\n');
      } catch (err) {
        console.error(' Error from LLM:', err.message);
      }

      rl.prompt();
    });

    rl.on('close', () => {
      console.log('\nGoodbye.');
      process.exit(0);
    });

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
