import { Router } from 'express';
import { getAllProducts, getProductById } from '../repositories/product.repository.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json({ data: products });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await getProductById(Number(req.params.id));
    if (!product) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }
    res.json({ data: product });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;