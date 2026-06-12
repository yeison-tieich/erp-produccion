import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getProducts, createProduct, updateProduct, adjustProductStock, uploadProductImage, deleteProduct, uploadProductPDF, getProductMovements, updateProductRoutes } from '../controllers/products.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'Inventario Producto_Images/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'prod-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });


router.get('/', authenticateToken, getProducts);
router.get('/:id/movements', authenticateToken, getProductMovements);
router.post('/', authenticateToken, authorizeRole(['Administrador']), createProduct);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateProduct);
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), deleteProduct);
router.post('/:id/stock', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), adjustProductStock);
router.post('/:id/image', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), upload.single('image'), uploadProductImage);
router.post('/:id/pdf', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), upload.single('pdf'), uploadProductPDF);
router.put('/:id/routes', authenticateToken, authorizeRole(['Administrador']), updateProductRoutes);

export default router;
