import { Router } from 'express';
import {
    getQualityDashboard,
    getControlPlans,
    getControlPlanById,
    createControlPlan,
    updateControlPlan,
    deleteControlPlan,
    getInspections,
    getInspectionById,
    createInspection,
    updateInspection,
    getNonConformances,
    getNonConformanceById,
    createNonConformance,
    updateNCDisposition,
    closeNonConformance,
    saveNCRootCause,
    getCorrectiveActions,
    createCorrectiveAction,
    updateCorrectiveAction,
    getQualityRisks,
    createQualityRisk,
    updateQualityRisk,
    getCustomerClaims,
    createCustomerClaim,
    updateCustomerClaim,
    getSuppliers,
    createSupplier,
    updateSupplier,
    evaluateSupplier,
    getAudits,
    createAudit,
    addAuditFinding,
    getDocumentsSGC,
    createDocumentSGC,
    createDocumentVersion,
    getTraceabilityByOT,
    getQualityAuditLogs
} from '../controllers/quality.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Dashboard
router.get('/dashboard', authenticateToken, getQualityDashboard);

// Planes de Control
router.get('/control-plans', authenticateToken, getControlPlans);
router.get('/control-plans/:id', authenticateToken, getControlPlanById);
router.post('/control-plans', authenticateToken, createControlPlan);
router.put('/control-plans/:id', authenticateToken, updateControlPlan);
router.delete('/control-plans/:id', authenticateToken, deleteControlPlan);

// Inspecciones
router.get('/inspections', authenticateToken, getInspections);
router.get('/inspections/:id', authenticateToken, getInspectionById);
router.post('/inspections', authenticateToken, createInspection);
router.put('/inspections/:id', authenticateToken, updateInspection);

// No Conformidades (NC)
router.get('/non-conformances', authenticateToken, getNonConformances);
router.get('/non-conformances/:id', authenticateToken, getNonConformanceById);
router.post('/non-conformances', authenticateToken, createNonConformance);
router.put('/non-conformances/:id/disposition', authenticateToken, updateNCDisposition);
router.put('/non-conformances/:id/close', authenticateToken, closeNonConformance);
router.post('/non-conformances/:id/root-cause', authenticateToken, saveNCRootCause);

// Acciones Correctivas (CAPA)
router.get('/corrective-actions', authenticateToken, getCorrectiveActions);
router.post('/corrective-actions', authenticateToken, createCorrectiveAction);
router.put('/corrective-actions/:id', authenticateToken, updateCorrectiveAction);

// Riesgos y Oportunidades
router.get('/risks', authenticateToken, getQualityRisks);
router.post('/risks', authenticateToken, createQualityRisk);
router.put('/risks/:id', authenticateToken, updateQualityRisk);

// Reclamos de Clientes
router.get('/claims', authenticateToken, getCustomerClaims);
router.post('/claims', authenticateToken, createCustomerClaim);
router.put('/claims/:id', authenticateToken, updateCustomerClaim);

// Proveedores
router.get('/suppliers', authenticateToken, getSuppliers);
router.post('/suppliers', authenticateToken, createSupplier);
router.put('/suppliers/:id', authenticateToken, updateSupplier);
router.post('/suppliers/:id/evaluate', authenticateToken, evaluateSupplier);

// Auditorías
router.get('/audits', authenticateToken, getAudits);
router.post('/audits', authenticateToken, createAudit);
router.post('/audits/:id/findings', authenticateToken, addAuditFinding);

// Documentación SGC
router.get('/documents', authenticateToken, getDocumentsSGC);
router.post('/documents', authenticateToken, createDocumentSGC);
router.post('/documents/:id/version', authenticateToken, createDocumentVersion);

// Trazabilidad 360°
router.get('/traceability/:id', authenticateToken, getTraceabilityByOT);

// Auditoría del Sistema
router.get('/audit-logs', authenticateToken, getQualityAuditLogs);

export default router;
