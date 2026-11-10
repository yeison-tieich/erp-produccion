import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

import {
  getProyectos,
  getProyecto,
  createProyecto,
  updateProyecto,
  deleteProyecto,
  generateProyectoPDF,
  addNote,
  updateMaterials,
  uploadAttachment,
  getPieces,
  addPiece,
  addPiecesBulk,
  addPieceRecord,
  deletePiece,
  updatePiece,
  updateFase,
  transitionFase,
  addFase,
  deleteFase,
  syncPieces
} from '../controllers/specialProjects.controller';

const router = Router();

// Configure Multer for file uploads with persistent disk storage in uploads/special-projects
const specialProjectsDir = path.resolve(__dirname, '../../uploads/special-projects');
if (!fs.existsSync(specialProjectsDir)) {
  fs.mkdirSync(specialProjectsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(specialProjectsDir)) {
      fs.mkdirSync(specialProjectsDir, { recursive: true });
    }
    cb(null, specialProjectsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }
});

router.get('/', authenticateToken, getProyectos);
router.get('/:id', authenticateToken, getProyecto);
router.post(
  '/',
  authenticateToken,
  authorizeRole(['Administrador', 'Supervisor']),
  upload.fields([
    { name: 'foto_referencia', maxCount: 1 },
    { name: 'plano_pdf', maxCount: 1 },
  ]),
  createProyecto
);
router.put(
  '/:id',
  authenticateToken,
  authorizeRole(['Administrador', 'Supervisor']),
  upload.fields([
    { name: 'foto_referencia', maxCount: 1 },
    { name: 'plano_pdf', maxCount: 1 },
  ]),
  updateProyecto
);
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), deleteProyecto);
router.get('/:id/pdf', authenticateToken, generateProyectoPDF);

// New Routes
router.post('/:id/notes', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), addNote);
router.put('/:id/materials', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), updateMaterials);
router.post('/:id/attachments', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), upload.single('archivo'), uploadAttachment);

// Piece Management
router.get('/:id/pieces', authenticateToken, getPieces);
router.post('/:id/pieces/bulk', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), addPiecesBulk);
router.put('/:id/pieces/sync', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), syncPieces);
router.post(
  '/:id/pieces', 
  authenticateToken,
  authorizeRole(['Administrador', 'Supervisor']),
  upload.fields([
    { name: 'plano_1', maxCount: 1 },
    { name: 'plano_2', maxCount: 1 },
  ]),
  addPiece
);
router.post('/pieces/:pieceId/records', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), addPieceRecord);
router.delete('/pieces/:pieceId', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), deletePiece);
router.put(
  '/pieces/:pieceId',
  authenticateToken,
  authorizeRole(['Administrador', 'Supervisor']),
  upload.fields([
    { name: 'plano_1', maxCount: 1 },
    { name: 'plano_2', maxCount: 1 },
  ]),
  updatePiece
);

// Update specific phase (to trigger progress recalculation)
router.put('/:id/fases/:faseId', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), updateFase);
router.post('/:id/fases/transition', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), transitionFase);
router.post('/:id/fases', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), addFase);
router.delete('/:id/fases/:faseId', authenticateToken, authorizeRole(['Administrador']), deleteFase);

export default router;
