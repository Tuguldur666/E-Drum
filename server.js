// server.js
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerdoc = require('./swagger-output.json');
const { connectToMongoDB } = require('./config/db');
const {
  errorHandler,
  notFoundHandler,
  requestLogger,
  rateLimiter,
  sanitizeInputs
} = require('./middleware/Handler');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config({ path: './config/config.env' });
const app = express();
const PORT = process.env.PORT;

app.use(express.json());

app.use(cors({
  origin: true,
  credentials: true,
  exposedHeaders: ['x-refresh-token'],
}));

app.use(requestLogger);
app.use(rateLimiter);
app.use(sanitizeInputs);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerdoc));

const userRouter = require('./routes/user');
app.use('/user', userRouter);

const adminRouter = require('./routes/admin');
app.use('/admin', adminRouter);

const verifyRouter = require('./routes/otp');
app.use('/otp', verifyRouter);

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.use(notFoundHandler);
app.use(errorHandler);

connectToMongoDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server is running at http://localhost:${PORT}`);
    });

  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

module.exports = app;
