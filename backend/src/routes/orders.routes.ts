
import { Router } from 'express';
import {
    createOrder,
    getOrders,
    updateOrder,
    deleteOrder,
    duplicateOrder,
    updateOrderStatus,
    getOrderDetails,
    addOperationToOrder,
    uploadOrderImage
} from '../controllers/orders.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/orders/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'order-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

const router = Router();

router.post('/', authenticateToken, authorizeRole(['Supervisor', 'Administrador']), createOrder);
router.get('/', authenticateToken, getOrders);
router.get('/:id/details', authenticateToken, getOrderDetails);
router.post('/:id/operations', authenticateToken, authorizeRole(['Supervisor', 'Administrador']), addOperationToOrder);
router.put('/:id', authenticateToken, authorizeRole(['Supervisor', 'Administrador']), updateOrder);
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), deleteOrder);
router.post('/:id/duplicate', authenticateToken, authorizeRole(['Supervisor', 'Administrador']), duplicateOrder);
router.patch('/:id/status', authenticateToken, authorizeRole(['Supervisor', 'Administrador', 'Operario']), updateOrderStatus);
router.post('/:id/image', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), upload.single('image'), uploadOrderImage);

export default router;
