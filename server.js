require("dotenv").config();
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const bodyParser = require("body-parser");
const cors = require('cors')

const swaggerDoc = require("./swagger-output.json");
const HttpError = require("./middleware/http-error");
const db = require("./db");
const userRoutes = require("./routes/user-routes");
const adminRoutes = require("./routes/admin-routes");

const app = express();

app.use(cors({
  origin: 'http://localhost:3001',  // frontend origin
  credentials: true                 // allow credentials (cookies, auth headers)
}));
app.use(bodyParser.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

    
app.use((req, res, next) => {
  throw new HttpError("Could not find this route.", 404);
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(error.code || 503).json({ message: error.message || "An unknown error occurred!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express running at http://localhost:${PORT}`);
});