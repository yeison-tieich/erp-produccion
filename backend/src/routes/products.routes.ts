
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getProducts, createProduct, updateProduct, adjustProductStock, uploadProductImage } from '../controllers/products.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });


router.get('/', authenticateToken, getProducts);
router.post('/', authenticateToken, authorizeRole(['Administrador']), createProduct);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateProduct);
router.post('/:id/stock', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), adjustProductStock);
router.post('/:id/image', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), upload.single('image'), uploadProductImage);

export default router;
