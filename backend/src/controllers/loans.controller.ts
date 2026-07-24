
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
        
        // 1. Fetch loan with tool
        const loan = await prisma.prestamoHerramienta.findUnique({
            where: { id: loanId },
            include: { herramienta: true }
        });

        if (!loan) {
            return res.status(400).json({ error: 'Préstamo no encontrado' });
        }
        
        if (loan.estado === 'DEVUELTO') {
            return res.status(400).json({ error: 'Este préstamo ya fue devuelto' });
        }

        const tool = loan.herramienta;
        if (!tool) {
            return res.status(400).json({ error: 'Error de integridad: Herramienta no vinculada al préstamo' });
        }

        // 2. Update loan record
        const updateData: any = {
            estado: 'DEVUELTO',
            fecha_devolucion: new Date()
        };
        if (observaciones !== undefined) {
            updateData.observaciones = observaciones;
        }

        const updatedLoan = await prisma.prestamoHerramienta.update({
            where: { id: loan.id },
            data: updateData
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

        // 4. Update tool stock and state
        try {
            await prisma.herramientaConsumible.update({
                where: { id: tool.id },
                data: {
                    cantidad_disponible: newDisponible,
                    estado: nuevoEstado
                }
            });
        } catch (invError) {
            console.error('[returnTool] Error actualizando inventario de la herramienta, ignorando...', invError);
        }

        res.json({ message: 'Herramienta devuelta con éxito (estado actualizado)', id: updatedLoan.id });
    } catch (error: any) {
        console.error('[returnTool] ERROR:', error.message || error);
        res.status(500).json({ error: error.message || 'Error desconocido al devolver herramienta' });
    }
};

