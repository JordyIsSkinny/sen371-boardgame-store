import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  filterProducts,
} from '../repositories/product.repository.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { playerCount, categoryId, mechanicId, maxPlayTime, sortBy, sortDir, page, pageSize } = req.query;

    const hasFilters =
      playerCount || categoryId || mechanicId || maxPlayTime || sortBy || sortDir || page || pageSize;

    if (hasFilters) {
      const result = await filterProducts({
        playerCount,
        categoryId,
        mechanicId,
        maxPlayTime,
        sortBy,
        sortDir,
        page,
        pageSize,
      });
      return res.json(result);
    }

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

router.post('/', async (req, res) => {
  try {
    const product = await createProduct(req.body);
    res.status(201).json({ data: product });
  } catch (err) {
    res.status(400).json({ error: { code: 'CREATE_FAILED', message: err.message } });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const product = await updateProduct(Number(req.params.id), req.body);
    res.json({ data: product });
  } catch (err) {
    res.status(400).json({ error: { code: 'UPDATE_FAILED', message: err.message } });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const product = await deleteProduct(Number(req.params.id));
    res.json({ data: product });
  } catch (err) {
    res.status(400).json({ error: { code: 'DELETE_FAILED', message: err.message } });
  }
});

export default router;