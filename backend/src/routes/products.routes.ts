import { Router } from 'express';
import type { RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { getProducts, getProductsDashboard, createProduct, updateProduct, adjustProductStock, uploadProductImage, deleteProduct, uploadProductPDF, getProductMovements, updateProductRoutes } from '../controllers/products.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

const productImageDirectory = path.resolve(__dirname, '../../uploads/products');
const imageExtensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
};

const productImageStorage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        fs.mkdir(productImageDirectory, { recursive: true }, error => callback(error, productImageDirectory));
    },
    filename: (_req, file, callback) => {
        callback(null, `${randomUUID()}${imageExtensions[file.mimetype] || '.jpg'}`);
    }
});

const uploadProductImageFile = multer({
    storage: productImageStorage,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        if (!imageExtensions[file.mimetype]) {
            return callback(new Error('Formato de imagen no permitido. Usa JPEG, PNG, WebP o GIF.'));
        }
        callback(null, true);
    }
});

const productPlanDirectory = path.resolve(__dirname, '../../uploads/products/plans');
const uploadProductPdfFile = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, callback) => {
            fs.mkdir(productPlanDirectory, { recursive: true }, error => callback(error, productPlanDirectory));
        },
        filename: (_req, _file, callback) => callback(null, `${randomUUID()}.pdf`)
    }),
    limits: { fileSize: 24 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        const hasPdfExtension = path.extname(file.originalname).toLowerCase() === '.pdf';
        const hasPdfMimeType = file.mimetype === 'application/pdf' || file.mimetype === 'application/octet-stream';
        if (!hasPdfExtension || !hasPdfMimeType) {
            return callback(new Error('Formato de plano no permitido. Selecciona un archivo PDF.'));
        }
        callback(null, true);
    }
});

const handleProductImageUpload: RequestHandler = (req, res, next) => {
    uploadProductImageFile.single('image')(req, res, error => {
        if (error) {
            const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
            return res.status(status).json({ error: error.message });
        }
        next();
    });
};

const handleProductPdfUpload: RequestHandler = (req, res, next) => {
    uploadProductPdfFile.single('pdf')(req, res, error => {
        if (error) {
            const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
            return res.status(status).json({ error: error.message });
        }
        next();
    });
};

router.get('/', authenticateToken, getProducts);
router.get('/dashboard', authenticateToken, getProductsDashboard);
router.get('/:id/movements', authenticateToken, getProductMovements);
router.post('/', authenticateToken, authorizeRole(['Administrador']), createProduct);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateProduct);
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), deleteProduct);
router.post('/:id/stock', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), adjustProductStock);
router.post('/:id/image', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), handleProductImageUpload, uploadProductImage);
router.post('/:id/pdf', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), handleProductPdfUpload, uploadProductPDF);
router.put('/:id/routes', authenticateToken, authorizeRole(['Administrador']), updateProductRoutes);

export default router;
