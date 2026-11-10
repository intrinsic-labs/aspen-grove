import { parseConfig } from './config.ts';
import { createMockServer } from './server.ts';

const main = () => {
  const config = parseConfig(process.argv.slice(2));
  const log = (line: string) => {
    if (!config.quiet) {
      console.log(`${new Date().toISOString()} ${line}`);
    }
  };
  const server = createMockServer(config, log);
  server.listen(config.port, config.host, () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : config.port;
    console.log(
      `Mock LM Studio on http://${config.host}:${port}: model "${config.modelId}" ` +
        `(${config.words} tokens at ${config.pace}/s), "${config.missingModelId}" answers 404` +
        (config.failEvery > 0
          ? `, completions #${config.failEvery}, #${config.failEvery * 2}, ... fail (${
              config.failMode === 'drop'
                ? `drop after ${config.dropAfter} tokens`
                : `HTTP ${config.failStatus}`
            })`
          : '')
    );
  });
  const stop = () => {
    server.closeAllConnections();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
