import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
  addPieceRecord,
  deletePiece,
  updatePiece,
  updateFase,
  addFase,
  deleteFase
} from '../controllers/specialProjects.controller';

const router = Router();

// Configure Multer for file uploads
const storage = multer.memoryStorage();

const upload = multer({ storage });

router.get('/', getProyectos);
router.get('/:id', getProyecto);
router.post(
  '/',
  upload.fields([
    { name: 'foto_referencia', maxCount: 1 },
    { name: 'plano_pdf', maxCount: 1 },
  ]),
  createProyecto
);
router.put(
  '/:id',
  upload.fields([
    { name: 'foto_referencia', maxCount: 1 },
    { name: 'plano_pdf', maxCount: 1 },
  ]),
  updateProyecto
);
router.delete('/:id', deleteProyecto);
router.get('/:id/pdf', generateProyectoPDF);

// New Routes
router.post('/:id/notes', addNote);
router.put('/:id/materials', updateMaterials);
router.post('/:id/attachments', upload.single('archivo'), uploadAttachment);

// Piece Management
router.get('/:id/pieces', getPieces);
router.post(
  '/:id/pieces', 
  upload.fields([
    { name: 'plano_1', maxCount: 1 },
    { name: 'plano_2', maxCount: 1 },
  ]),
  addPiece
);
router.post('/pieces/:pieceId/records', addPieceRecord);
router.delete('/pieces/:pieceId', deletePiece);
router.put(
  '/pieces/:pieceId',
  upload.fields([
    { name: 'plano_1', maxCount: 1 },
    { name: 'plano_2', maxCount: 1 },
  ]),
  updatePiece
);

// Update specific phase (to trigger progress recalculation)
router.put('/:id/fases/:faseId', updateFase);
router.post('/:id/fases', addFase);
router.delete('/:id/fases/:faseId', deleteFase);

export default router;
