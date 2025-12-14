import app from './app.js';
import config from './config.js';

app.listen(config.port, () => {
  console.log(`${config.name} ${config.version}`);
  console.log(`Listening on ${config.port} with NODE_ENV=${config.nodeEnv}`);
});
