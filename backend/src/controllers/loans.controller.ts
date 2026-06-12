
import { Request, Response } from 'express';
import prisma from '../prisma';

export const getLoans = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        const loans = await prisma.prestamoHerramienta.findMany({
            where: status ? { estado: String(status) } : {},
            include: {
                herramienta: true,
                personal: true
            },
            orderBy: { fecha_prestamo: 'desc' }
        });
        res.json(loans);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching loans' });
    }
};

export const lendTool = async (req: Request, res: Response) => {
    const { herramienta_id, personal_id, cantidad, observaciones } = req.body;
    
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Check tool availability
            const tool = await tx.herramientaConsumible.findUnique({
                where: { id: Number(herramienta_id) }
            });

            if (!tool) throw new Error('Herramienta no encontrada');
            if (tool.cantidad_disponible < Number(cantidad)) {
                throw new Error('Stock insuficiente para el préstamo');
            }

            // 2. Create loan record
            const loan = await tx.prestamoHerramienta.create({
                data: {
                    herramienta_id: Number(herramienta_id),
                    personal_id: Number(personal_id),
                    cantidad: Number(cantidad),
                    observaciones,
                    estado: 'ACTIVO'
                }
            });

            // 3. Update tool stock and state
            const newDisponible = tool.cantidad_disponible - Number(cantidad);
            let nuevoEstado = tool.estado;
            
            if (newDisponible === 0) {
                nuevoEstado = 'EN USO';
            } else if (newDisponible < tool.cantidad_total) {
                nuevoEstado = 'PARCIALMENTE EN USO';
            }

            await tx.herramientaConsumible.update({
                where: { id: tool.id },
                data: {
                    cantidad_disponible: newDisponible,
                    estado: nuevoEstado
                }
            });

            return loan;
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Error lending tool:', error.message);
        res.status(400).json({ error: error.message });
    }
};

export const returnTool = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { observaciones } = req.body;

    console.log(`[returnTool] Attempting return for loan ID: ${id}`);
    
    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: 'ID de préstamo inválido' });
    }

    try {
        const loanId = Number(id);
        console.log(`[returnTool] Parsed loanId: ${loanId}`);
        
        const result = await prisma.$transaction(async (tx) => {
            console.log(`[returnTool] Starting transaction for loanId: ${loanId}`);
            // 1. Fetch loan with tool
            const loan = await tx.prestamoHerramienta.findUnique({
                where: { id: loanId },
                include: { herramienta: true }
            });

            if (!loan) {
                console.warn(`[returnTool] Loan not found: ${loanId}`);
                throw new Error('Préstamo no encontrado');
            }
            
            if (loan.estado === 'DEVUELTO') {
                console.warn(`[returnTool] Loan already returned: ${loanId}`);
                throw new Error('Este préstamo ya fue devuelto');
            }

            const tool = loan.herramienta;
            if (!tool) {
                console.error(`[returnTool] Integrity Error: No tool linked to loan ${loanId}`);
                throw new Error('Error de integridad: Herramienta no vinculada al préstamo');
            }

            console.log(`[returnTool] Loan and tool found. Tool: ${tool.nombre}, Qty: ${loan.cantidad}`);

            // 2. Update loan record
            const updatedLoan = await tx.prestamoHerramienta.update({
                where: { id: loan.id },
                data: {
                    estado: 'DEVUELTO',
                    fecha_devolucion: new Date(),
                    observaciones: observaciones || loan.observaciones
                }
            });

            // 3. Calculate new stock
            const currentDisponible = Number(tool.cantidad_disponible || 0);
            const loanCantidad = Number(loan.cantidad || 0);
            const totalStock = Number(tool.cantidad_total || 0);
            
            let newDisponible = currentDisponible + loanCantidad;
            if (newDisponible > totalStock) {
                newDisponible = totalStock;
            }

            let nuevoEstado = 'DISPONIBLE';
            if (newDisponible < totalStock) {
                nuevoEstado = 'PARCIALMENTE EN USO';
            }
            if (newDisponible === 0) {
                nuevoEstado = 'EN USO';
            }

            console.log(`[returnTool] Updating tool stock: ${currentDisponible} -> ${newDisponible}, State: ${nuevoEstado}`);

            // 4. Update tool stock and state
            await tx.herramientaConsumible.update({
                where: { id: tool.id },
                data: {
                    cantidad_disponible: newDisponible,
                    estado: nuevoEstado
                }
            });

            return updatedLoan;
        }, {
            timeout: 10000 // Increase timeout to 10 seconds
        });

        console.log(`[returnTool] Successfully returned loan ID: ${result.id}`);
        res.json({ message: 'Herramienta devuelta con éxito', id: result.id });
    } catch (error: any) {
        const fs = require('fs');
        const logMsg = `[${new Date().toISOString()}] ERROR: ${error.message}\nSTACK: ${error.stack}\nLOAN_ID: ${id}\n\n`;
        fs.appendFileSync('return_error.log', logMsg);
        
        console.error('[returnTool] ERROR:', error.message || error);
        if (error.stack) console.error(error.stack);
        
        const errorMessage = error.message || 'Error desconocido al devolver herramienta';
        const statusCode = (errorMessage.includes('no encontrado') || errorMessage.includes('ya fue devuelto')) ? 400 : 500;
        
        res.status(statusCode).json({ 
            error: errorMessage,
            details: error.code || error.stack || undefined
        });
    }


};

