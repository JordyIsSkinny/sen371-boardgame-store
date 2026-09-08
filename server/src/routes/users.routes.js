import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate, updateUserSchema, userIdSchema } from '../middleware/validate.js';
import { getUserById, updateUser, getAllUsers } from '../repositories/user-profile.repository.js';

const router = Router();

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    }
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

router.put('/me', authenticate, validate({ body: updateUserSchema }), async (req, res, next) => {
  try {
    const user = await updateUser(req.user.id, req.body);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const users = await getAllUsers();
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, authorize('admin'), validate({ params: userIdSchema }), async (req, res, next) => {
  try {
    const user = await getUserById(Number(req.params.id));
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    }
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

export default router;