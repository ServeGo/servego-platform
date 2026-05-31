const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { notFoundHandler, errorHandler } = require('./middleware/error');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

