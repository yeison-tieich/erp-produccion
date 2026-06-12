import { Router } from 'express';
import { pushChanges, pullChanges } from '../controllers/sync.controller';

const router = Router();

router.post('/push', pushChanges);
router.get('/pull', pullChanges);

export default router;
