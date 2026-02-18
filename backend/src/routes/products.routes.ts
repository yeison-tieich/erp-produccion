
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getProducts, createProduct, updateProduct, adjustProductStock, uploadProductImage } from '../controllers/products.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Ensure images folder exists
const imagesDir = path.join(__dirname, '../../Inventario Producto_Images');
if (!fs.existsSync(imagesDir)) {
	fs.mkdirSync(imagesDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, imagesDir);
	},
	filename: function (req, file, cb) {
		const ext = path.extname(file.originalname);
		const name = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
		cb(null, name);
	}
});

const upload = multer({ storage });

router.get('/', authenticateToken, getProducts);
router.post('/', authenticateToken, authorizeRole(['Administrador']), createProduct);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateProduct);
router.post('/:id/stock', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), adjustProductStock);
router.post('/:id/image', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), upload.single('image'), uploadProductImage);

export default router;
