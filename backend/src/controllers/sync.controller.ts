import { Request, Response } from 'express';
import prisma from '../prisma';

export const pushChanges = async (req: Request, res: Response) => {
  const { changes } = req.body; // Array de { table_name, action, payload, record_id_local }

  if (!Array.isArray(changes)) {
    return res.status(400).json({ error: 'Changes must be an array' });
  }

  const results = [];

  const cleanSyncData = (data: any) => {
    const { id_local, id_server, id, sync_status, updated_at, deleted, version, ...clean } = data;
    const finalData: any = {};
    Object.keys(clean).forEach(key => {
      const val = clean[key];
      // Solo permitimos valores primitivos (strings, numbers, booleans, null)
      // Evitamos objetos (relaciones) que vienen del frontend y romperían Prisma
      if (typeof val !== 'object' || val === null) {
        finalData[key] = val;
      }
    });
    return finalData;
  };

  for (const change of changes) {
    const { table_name, action, payload, record_id_local } = change;
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

    try {
      let result;
      if (table_name === 'OrdenTrabajo') {
        const cleanData = cleanSyncData(data);
        if (action === 'INSERT') {
          result = await prisma.ordenTrabajo.create({ data: cleanData });
        } else if (action === 'UPDATE') {
          result = await prisma.ordenTrabajo.update({
            where: { id: data.id_server || data.id },
            data: cleanData
          });
        } else if (action === 'DELETE') {
          result = await prisma.ordenTrabajo.delete({ where: { id: data.id_server || data.id } });
        }
      } else if (table_name === 'MovimientoInventarioMP') {
        if (action === 'INSERT') {
          const cleanData = cleanSyncData(data);
          result = await prisma.movimientoInventarioMP.create({ data: cleanData });
        }
      } else if (table_name === 'MateriaPrima') {
        const cleanData = cleanSyncData(data);
        if (action === 'INSERT') {
          result = await prisma.materiaPrima.create({ data: cleanData });
        } else if (action === 'UPDATE') {
          result = await prisma.materiaPrima.update({
            where: { id: data.id_server || data.id },
            data: cleanData
          });
        }
      } else if (table_name === 'TareaProduccion') {
        const cleanData = cleanSyncData(data);
        if (action === 'INSERT') {
          result = await prisma.tareaProduccion.create({ data: cleanData });
        } else if (action === 'UPDATE') {
          result = await prisma.tareaProduccion.update({
            where: { id: data.id_server || data.id },
            data: cleanData
          });
        }
      }

      results.push({
        record_id_local,
        id_server: result?.id,
        status: 'success'
      });
    } catch (error: any) {
      console.error(`Sync error on ${table_name}:`, error);
      results.push({
        record_id_local,
        status: 'error',
        message: error.message
      });
    }
  }

  res.json({ results });
};

export const pullChanges = async (req: Request, res: Response) => {
  const { lastSync } = req.query;
  const lastSyncDate = lastSync ? new Date(Number(lastSync)) : new Date(0);

  try {
    const [ordenes, movimientos, materiasPrimas, tareas] = await Promise.all([
      prisma.ordenTrabajo.findMany({
        where: { updatedAt: { gt: lastSyncDate } },
        include: { producto: true }
      }),
      prisma.movimientoInventarioMP.findMany({
        where: { updatedAt: { gt: lastSyncDate } }
      }),
      prisma.materiaPrima.findMany(),
      prisma.tareaProduccion.findMany({
        where: { updatedAt: { gt: lastSyncDate } },
        include: { 
            ordenTrabajo: { include: { producto: true } },
            rutaFabricacion: true,
            personal: true,
            maquina: true
        }
      })
    ]);

    res.json({
      changes: {
        OrdenTrabajo: ordenes,
        MovimientoInventarioMP: movimientos,
        MateriaPrima: materiasPrimas,
        TareaProduccion: tareas
      },
      serverTime: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
