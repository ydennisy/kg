# `kg`: Knowledge Graph One

`kg` is a knowledge management application, designed to help:

- archive and save information such as links
- use spaced repetition to remember knowledge
- create tiny bits of information `atoms` to later join into `molecules`
- selectively publish `nodes` to the web as a digital garden

## Development

### Local Testing with Global Command

To test the CLI globally during development:

```bash
# Link the dev version globally
npm link

# Test the global command
kg --help

# Unlink the dev version to use published version
npm unlink kg1-cli

# Or alternatively
npm unlink -g kg1-cli
```

After unlinking, you can install the published version normally with
`npm install -g kg1-cli`.
