
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { readPO, uploadOnly, generateRoute, saveRouteToOrder, getAIConfig, updateAIConfig } from '../controllers/ai.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Multer config for PO uploads
const storage = multer.memoryStorage();

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF') as any, false);
        }
    }
});

router.post('/read-po', authenticateToken, upload.single('pdf'), readPO);
router.post('/upload-only', authenticateToken, upload.single('pdf'), uploadOnly);
router.post('/generate-route', authenticateToken, generateRoute);
router.post('/save-route', authenticateToken, saveRouteToOrder);
router.get('/config', authenticateToken, getAIConfig);
router.post('/config', authenticateToken, updateAIConfig);

export default router;
