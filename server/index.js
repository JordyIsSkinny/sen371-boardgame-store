import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import productsRouter from './src/routes/products.routes.js';
import categoriesRouter from './src/routes/categories.routes.js';
import mechanicsRouter from './src/routes/mechanics.routes.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1/products', productsRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/mechanics', mechanicsRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});