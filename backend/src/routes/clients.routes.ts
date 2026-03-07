
import { Router } from 'express';
import { getClients, getClientDetails, updateClient, updateClientRating } from '../controllers/clients.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getClients);
router.get('/:id', authenticateToken, getClientDetails);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateClient);
router.patch('/:id/rating', authenticateToken, updateClientRating);

export default router;
