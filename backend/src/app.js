const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const requestId = require('./middleware/requestId');

const app = express();

app.use(requestId);
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: env.maxJsonBodySize }));
app.use(express.urlencoded({ extended: true, limit: env.maxJsonBodySize }));

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
