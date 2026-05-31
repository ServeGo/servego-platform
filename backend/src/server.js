require('dotenv').config();

const http = require('http');

const mongoose = require('mongoose');
const app = require('./app');
const { env } = require('./config/env');

async function start() {
  await mongoose.connect(env.MONGODB_URI);
  // eslint-disable-next-line no-console
  console.log('MongoDB connected');

  const server = http.createServer(app);
  server.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${env.PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});

