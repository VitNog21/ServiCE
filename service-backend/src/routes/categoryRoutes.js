// src/routes/categoryRoutes.js
import { Router } from 'express';
import { getCategories } from '../controllers/CategoryController.js';

const router = Router();

router.get('/', getCategories);

export default router;