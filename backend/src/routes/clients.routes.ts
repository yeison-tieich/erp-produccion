
import { Router } from 'express';
import { getClients, getClientDetails, updateClient, updateClientRating, deleteClient, bindProducts, unbindProducts } from '../controllers/clients.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getClients);
router.get('/:id', authenticateToken, getClientDetails);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateClient);
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), deleteClient);
router.patch('/:id/rating', authenticateToken, updateClientRating);
router.post('/:id/bind-products', authenticateToken, bindProducts);
router.post('/:id/unbind-products', authenticateToken, unbindProducts);

export default router;

