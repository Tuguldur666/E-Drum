const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerdoc = require('./swagger-output.json');
const errorHandler = require('./middleware/errorHandler');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config({ path: './config/config.env' });
const app = express();
const PORT = process.env.PORT 

app.use(express.json());

app.use(cors({
  origin: true,
  credentials: true,
  exposedHeaders: ['x-refresh-token'],
}));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerdoc));
const userRouter = require('./routes/user');
app.use('/user', userRouter);

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
