import { Router } from 'express';
import { 
    getSettings, updateSettings, 
    getOperationsCatalog, createOperation, 
    updateOperation, deleteOperation,
    getUserSettings, updateUserSettings
} from '../controllers/settings.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getSettings);
router.put('/', updateSettings);

router.get('/operations', getOperationsCatalog);
router.post('/operations', createOperation);
router.put('/operations/:id', updateOperation);
router.delete('/operations/:id', deleteOperation);

router.get('/user', authenticateToken, getUserSettings);
router.put('/user', authenticateToken, updateUserSettings);

export default router;
