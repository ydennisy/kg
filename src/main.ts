import { CLI } from './external/cli/cli.js';
import { ConfigLoader } from './external/config/config-loader.js';
import { ApplicationFactory } from './application/application-factory.js';

const run = async () => {
  const configLoader = new ConfigLoader();
  const config = await configLoader.load();

  if (!config) {
    console.log(
      `
      Welcome to KG!
      You are missing a configuration.
      Please run: kg install
      `
    );
    return;
  }

  const factory = new ApplicationFactory(config);
  const useCases = factory.createUseCases();

  const cli = new CLI(useCases);
  cli.run(process.argv);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(console.error);
}
