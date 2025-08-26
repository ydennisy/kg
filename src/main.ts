import { CLI } from './external/cli/cli.js';
import { ConfigLoader } from './external/config/config-loader.js';
import { ApplicationFactory } from './application/application-factory.js';

const run = async () => {
  // TODO: this feel like a bit of a hack, but the other
  // option would be to add config checks inside each usecase.
  if (process.argv[2] === 'init') {
    CLI.init();
    return;
  }

  const configLoader = new ConfigLoader();
  const config = await configLoader.load();

  if (!config) {
    console.log(
      `
      Welcome to KG!
      You are missing a configuration.
      Please run: kg init
      `
    );
    return;
  }

  const factory = new ApplicationFactory(config);
  const useCases = factory.createUseCases();

  const cli = new CLI(useCases);
  cli.run(process.argv);
};

// Check if this module is being run directly (handles both direct execution and npm link)
if (process.argv[1] && import.meta.url.startsWith('file://')) {
  run().catch(console.error);
}
