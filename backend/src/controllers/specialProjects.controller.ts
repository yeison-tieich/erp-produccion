import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getProyectos = async (req: Request, res: Response) => {
  try {
    const proyectos = await prisma.proyectoEspecial.findMany({
      include: {
        fases: true,
      },
    });
    res.json(proyectos);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProyecto = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const proyecto = await prisma.proyectoEspecial.findUnique({
      where: { id: Number(id) },
      include: {
        fases: true,
        historial: true,
        archivos: true,
        notas: true,
        cargas_maquina: {
          include: {
            maquina: true,
          },
        },
      },
    });
    if (!proyecto) return res.status(404).json({ message: 'Proyecto no encontrado' });
    res.json(proyecto);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createProyecto = async (req: Request, res: Response) => {
  try {
    const {
      cliente,
      descripcion_tecnica,
      tipo_proyecto,
      responsable_tecnico,
      fecha_inicio,
      fecha_compromiso,
      prioridad,
      penalidad_retraso,
    } = req.body;

    // Regla: No permitir iniciar más de X proyectos activos
    const config = await prisma.configuracion.findFirst();
    const maxProyectosActivos = config?.max_proyectos_activos || 10; // Default to 10 if not set
    const proyectosActivos = await prisma.proyectoEspecial.count({
      where: { estado: 'Activo' },
    });

    if (proyectosActivos >= maxProyectosActivos) {
      return res.status(400).json({
        message: `No se pueden iniciar más de ${maxProyectosActivos} proyectos activos.`,
      });
    }

    const newProyecto = await prisma.proyectoEspecial.create({
      data: {
        cliente,
        descripcion_tecnica,
        tipo_proyecto,
        responsable_tecnico,
        fecha_inicio: new Date(fecha_inicio),
        fecha_compromiso: new Date(fecha_compromiso),
        prioridad,
        penalidad_retraso,
        estado: 'Activo', // o 'Pendiente'
        fases: {
          create: [
            { nombre: 'Diseño', responsable: responsable_tecnico, horas_estimadas: 0, fecha_inicio: new Date(), estado: 'Pendiente' },
            { nombre: 'Programación', responsable: responsable_tecnico, horas_estimadas: 0, fecha_inicio: new Date(), estado: 'Pendiente' },
            { nombre: 'Fabricación', responsable: responsable_tecnico, horas_estimadas: 0, fecha_inicio: new Date(), estado: 'Pendiente' },
            { nombre: 'Ajuste', responsable: responsable_tecnico, horas_estimadas: 0, fecha_inicio: new Date(), estado: 'Pendiente' },
            { nombre: 'Prueba', responsable: responsable_tecnico, horas_estimadas: 0, fecha_inicio: new Date(), estado: 'Pendiente' },
            { nombre: 'Cierre', responsable: responsable_tecnico, horas_estimadas: 0, fecha_inicio: new Date(), estado: 'Pendiente' },
          ],
        },
      },
      include: {
        fases: true,
      },
    });

    res.status(201).json(newProyecto);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProyecto = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, ...dataToUpdate } = req.body; // userId to be sent from frontend

    const proyectoActual = await prisma.proyectoEspecial.findUnique({
      where: { id: Number(id) },
      include: { fases: { orderBy: { id: 'asc' } } },
    });

    if (!proyectoActual) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Regla: No permitir cambiar de fase sin cerrar la anterior
    if (dataToUpdate.fases) {
      for (let i = 0; i < dataToUpdate.fases.length; i++) {
        const faseActualizada = dataToUpdate.fases[i];
        const faseOriginal = proyectoActual.fases[i];

        if (faseActualizada.estado !== faseOriginal.estado && faseActualizada.estado !== 'Cerrada') {
          if (i > 0) {
            const faseAnterior = proyectoActual.fases[i - 1];
            if (faseAnterior.estado !== 'Cerrada') {
              return res.status(400).json({
                message: `No se puede cambiar el estado de la fase "${faseActualizada.nombre}" sin haber cerrado la fase anterior "${faseAnterior.nombre}".`,
              });
            }
          }
        }
      }
    }
    
    // TODO: A more granular update of phases might be needed
    const updatedProyecto = await prisma.proyectoEspecial.update({
      where: { id: Number(id) },
      data: dataToUpdate,
    });

    // Registrar quién mueve el proyecto
    if (userId) {
      await prisma.historialCambios.create({
        data: {
          proyecto_id: Number(id),
          usuario_id: userId,
          descripcion: `El proyecto fue actualizado.`, // Can be more descriptive
        },
      });
    }

    res.json(updatedProyecto);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProyecto = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.$transaction([
      prisma.cargaMaquina.deleteMany({ where: { proyecto_id: Number(id) } }),
      prisma.historialCambios.deleteMany({ where: { proyecto_id: Number(id) } }),
      prisma.archivoAdjunto.deleteMany({ where: { proyecto_id: Number(id) } }),
      prisma.notaTecnica.deleteMany({ where: { proyecto_id: Number(id) } }),
      prisma.faseProyecto.deleteMany({ where: { proyecto_id: Number(id) } }),
      prisma.proyectoEspecial.delete({ where: { id: Number(id) } }),
    ]);

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }
    res.status(500).json({ message: error.message });
  }
};
