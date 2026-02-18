
import { Router } from 'express';
import {
    createOrder,
    getOrders,
    updateOrder,
    deleteOrder,
    duplicateOrder,
    updateOrderStatus,
    getOrderDetails,
    addOperationToOrder
} from '../controllers/orders.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticateToken, authorizeRole(['Supervisor', 'Administrador']), createOrder);
router.get('/', authenticateToken, getOrders);
router.get('/:id/details', authenticateToken, getOrderDetails);
router.post('/:id/operations', authenticateToken, authorizeRole(['Supervisor', 'Administrador']), addOperationToOrder);
router.put('/:id', authenticateToken, authorizeRole(['Supervisor', 'Administrador']), updateOrder);
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), deleteOrder);
router.post('/:id/duplicate', authenticateToken, authorizeRole(['Supervisor', 'Administrador']), duplicateOrder);
router.patch('/:id/status', authenticateToken, authorizeRole(['Supervisor', 'Administrador', 'Operario']), updateOrderStatus);

export default router;
