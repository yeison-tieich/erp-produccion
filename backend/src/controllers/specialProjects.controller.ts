import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { uploadToCloudinary } from '../utils/cloudinary';

const prisma = new PrismaClient();
const STANDARD_PHASES = ['Diseño', 'Materiales', 'Programación', 'Fabricación', 'Ajuste', 'Prueba', 'Cierre'];

const getPhaseInProject = async (projectId: number, phaseId: number) => {
  const phase = await prisma.faseProyecto.findFirst({
    where: { id: phaseId, proyecto_id: projectId },
    orderBy: { id: 'asc' },
  });

  if (!phase) {
    const error = new Error('La fase no pertenece al proyecto indicado');
    (error as any).statusCode = 404;
    throw error;
  }

  return phase;
};

export const getProyectos = async (req: Request, res: Response) => {
  try {
    const proyectos = await prisma.proyectoEspecial.findMany({
      include: {
          fases: { orderBy: { secuencia: 'asc' } },
        materiales: true,
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
          fases: { orderBy: { secuencia: 'asc' } },
          ordenes: {
            select: {
              id: true,
              numero_ot: true,
              estado_ot: true,
              fecha_entrega_req: true,
              tipo_orden: true,
            },
            orderBy: { id: 'desc' },
          },
        historial: { orderBy: { fecha: 'desc' } },
        archivos: true,
        notas: { orderBy: { fecha: 'desc' } },
        materiales: true,
        piezas: {
          include: {
            registros: { orderBy: { fecha: 'desc' } }
          }
        },
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

    let foto_referencia_url = null;
    let plano_pdf_url = null;
    if (req.files) {
      const files = req.files as any;
      if (files['foto_referencia'] && files['foto_referencia'].length > 0) {
        const result = await uploadToCloudinary(files['foto_referencia'][0].buffer, 'special-projects');
        foto_referencia_url = result.secure_url;
      }
      if (files['plano_pdf'] && files['plano_pdf'].length > 0) {
        const result = await uploadToCloudinary(files['plano_pdf'][0].buffer, 'special-projects');
        plano_pdf_url = result.secure_url;
      }
    }

    // Regla: No permitir iniciar más de X proyectos activos
    const config = await prisma.configuracion.findFirst();
    const maxProyectosActivos = config?.max_proyectos_activos || 10; // Default to 10 if not set
    const proyectosActivos = await prisma.proyectoEspecial.count({
      where: { estado: { in: ['Pendiente', 'Activo', 'En proceso', 'En pausa'] } },
    });

    if (proyectosActivos >= maxProyectosActivos) {
      return res.status(400).json({
        message: `No se pueden iniciar más de ${maxProyectosActivos} proyectos activos.`,
      });
    }

    const { fases } = req.body;
    let parsedFases: any[] = STANDARD_PHASES.map((nombre) => ({ nombre }));
    if (fases !== undefined) {
      try {
        parsedFases = typeof fases === 'string' ? JSON.parse(fases) : fases;
      } catch {
        return res.status(400).json({ message: 'La configuración de fases no es válida' });
      }
    }

    if (!Array.isArray(parsedFases) || parsedFases.length === 0) {
      return res.status(400).json({ message: 'El proyecto debe tener al menos una fase' });
    }

    const phaseNames = parsedFases.map((phase: any) => String(phase?.nombre || '').trim());
    if (phaseNames.some((name: string) => !name) || new Set(phaseNames).size !== phaseNames.length) {
      return res.status(400).json({ message: 'Las fases deben tener nombres únicos y no vacíos' });
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
        estado: 'Pendiente', 
        foto_referencia_url,
        plano_pdf_url,
        fases: {
          create: parsedFases.map((f: any, index: number) => ({
            nombre: f.nombre,
            secuencia: (index + 1) * 10,
            responsable: f.responsable || responsable_tecnico,
            horas_estimadas: Number(f.horas_estimadas) || 0,
            fecha_inicio: f.fecha_inicio ? new Date(f.fecha_inicio) : new Date(),
            estado: f.estado || 'Pendiente'
          })),
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
    let { fases, ...dataToUpdate } = req.body;

    // Parse fases as it might come as stringified JSON from FormData
    let parsedFases = fases;
    if (typeof fases === 'string') {
      try {
        parsedFases = JSON.parse(fases);
      } catch (e) {
        console.error('Error parsing fases', e);
      }
    }

    // Convert numeric fields from string (FormData sends everything as string)
    const numericFields = ['porcentaje_avance'];
    numericFields.forEach(field => {
      if (dataToUpdate[field] !== undefined) {
        dataToUpdate[field] = Number(dataToUpdate[field]);
      }
    });

    // Define valid model fields for ProyectoEspecial to avoid Prisma errors
    const validFields = [
      'codigo', 'descripcion_tecnica', 'cliente', 'tipo_proyecto', 
      'responsable_tecnico', 'fecha_inicio', 'fecha_compromiso', 
      'prioridad', 'estado', 'penalidad_retraso', 'porcentaje_avance',
      'indicador_riesgo', 'bloqueado'
    ];

    const prismaData: any = {};
    validFields.forEach(field => {
      if (dataToUpdate[field] !== undefined) {
        let value = dataToUpdate[field];
        
        // Type conversions
        if (field === 'porcentaje_avance') value = Number(value);
        if (field === 'fecha_inicio' || field === 'fecha_compromiso') value = new Date(value);
        if (field === 'bloqueado') value = value === 'true' || value === true;
        
        prismaData[field] = value;
      }
    });

    if (req.files) {
      const files = req.files as any;
      if (files['foto_referencia'] && files['foto_referencia'].length > 0) {
        const result = await uploadToCloudinary(files['foto_referencia'][0].buffer, 'special-projects');
        prismaData.foto_referencia_url = result.secure_url;
      }
      if (files['plano_pdf'] && files['plano_pdf'].length > 0) {
        const result = await uploadToCloudinary(files['plano_pdf'][0].buffer, 'special-projects');
        prismaData.plano_pdf_url = result.secure_url;
      }
    }

    const proyectoActual = await prisma.proyectoEspecial.findUnique({
      where: { id: Number(id) },
      include: { fases: { orderBy: { id: 'asc' } } },
    });

    if (!proyectoActual) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    const requestedStatus = dataToUpdate.estado;
    const validStatuses = ['Pendiente', 'En proceso', 'En pausa', 'Finalizado'];
    if (requestedStatus !== undefined && !validStatuses.includes(requestedStatus)) {
      return res.status(400).json({ message: 'Estado de proyecto inválido' });
    }

    if (requestedStatus === 'Finalizado') {
      const incompletePhases = proyectoActual.fases.filter(
        (phase) => !['Completada', 'Cerrada', 'Omitida'].includes(phase.estado)
      );

      if (incompletePhases.length > 0) {
        return res.status(400).json({
          message: `No se puede finalizar el proyecto: quedan fases abiertas (${incompletePhases.map((phase) => phase.nombre).join(', ')}).`,
        });
      }
    }

    if (parsedFases && Array.isArray(parsedFases)) {
      for (let i = 0; i < parsedFases.length; i++) {
        const faseActualizada = parsedFases[i];
        const faseOriginal = proyectoActual.fases.find((f: any) => f.id === faseActualizada.id);

        if (!faseOriginal) {
          return res.status(404).json({ message: 'La fase no pertenece al proyecto indicado' });
        }

        // Update phases recursively or individually for specific fields
        await prisma.faseProyecto.update({
          where: { id: faseOriginal.id },
          data: {
            estado: faseActualizada.estado,
            responsable: faseActualizada.responsable,
            horas_reales: faseActualizada.horas_reales ? Number(faseActualizada.horas_reales) : undefined,
            maquina_id: faseActualizada.maquina_id ? Number(faseActualizada.maquina_id) : undefined,
            personal_id: faseActualizada.personal_id ? Number(faseActualizada.personal_id) : undefined,
            costo_operacion: faseActualizada.costo_operacion ? Number(faseActualizada.costo_operacion) : undefined,
          }
        });
      }
    }
    
    // Final project update with sanitized data
    const updatedProyecto = await prisma.proyectoEspecial.update({
      where: { id: Number(id) },
      data: prismaData,
    });

    // Registrar quién mueve el proyecto
    const authenticatedUserId = Number((req as any).user?.id);
    if (Number.isInteger(authenticatedUserId)) {
      let descripcionCambio = 'El proyecto fue actualizado.';
      if (dataToUpdate.estado && dataToUpdate.estado !== proyectoActual.estado) {
        descripcionCambio = `El estado del proyecto cambió de "${proyectoActual.estado}" a "${dataToUpdate.estado}".`;
      }

      await prisma.historialCambios.create({
        data: {
          proyecto_id: Number(id),
          usuario_id: authenticatedUserId,
          descripcion: descripcionCambio,
        },
      });
    }

    res.json(updatedProyecto);
  } catch (error: any) {
    console.error('Update project error:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// Utility to calculate project progress
const calculateProjectProgress = async (
  projectId: number,
  db: PrismaClient | Prisma.TransactionClient = prisma
) => {
  const परियोजना = await db.proyectoEspecial.findUnique({
    where: { id: projectId },
    include: {
      fases: true,
      piezas: true
    }
  });

  if (!परियोजना) return 0;

  const totalFases = परियोजना.fases.length;
  if (totalFases === 0) return 0;

  const totalPiezas = परियोजना.piezas.reduce((total, pieza) => total + Math.max(pieza.cantidad, 0), 0);
  const avancePiezas = totalPiezas > 0
    ? परियोजना.piezas.reduce(
        (total, pieza) => total + Math.max(pieza.cantidad, 0) * Math.min(Math.max(pieza.avance_fabricacion || 0, 0), 100),
        0
      ) / totalPiezas
    : null;

  const progress = परियोजना.fases.reduce((total, fase) => {
    if (fase.nombre === 'Fabricación' && avancePiezas !== null) return total + avancePiezas;
    return total + (['Completada', 'Cerrada', 'Omitida'].includes(fase.estado) ? 100 : 0);
  }, 0) / totalFases;

  return Math.min(Math.round(progress), 100);
};

export const updateFase = async (req: Request, res: Response) => {
  try {
    const { id, faseId } = req.params;
    const { estado, responsable, horas_reales, maquina_id, personal_id, costo_operacion, observaciones } = req.body;

    const projectId = Number(id);
    const phaseId = Number(faseId);
    if (!Number.isInteger(projectId) || !Number.isInteger(phaseId)) {
      return res.status(400).json({ message: 'Identificadores de proyecto o fase inválidos' });
    }

    const phase = await getPhaseInProject(projectId, phaseId);
    const isClosing = estado === 'Completada' || estado === 'Cerrada';

    const parsedHours = horas_reales === undefined || horas_reales === '' ? undefined : Number(horas_reales);
    if (parsedHours !== undefined && (!Number.isFinite(parsedHours) || parsedHours < 0)) {
      return res.status(400).json({ message: 'Las horas reales deben ser un número mayor o igual a cero' });
    }

    const updatedFase = await prisma.$transaction(async (tx) => {
      const updated = await tx.faseProyecto.update({
        where: { id: phase.id },
        data: {
          estado,
          responsable,
          horas_reales: parsedHours,
          maquina_id: maquina_id ? Number(maquina_id) : undefined,
          personal_id: personal_id ? Number(personal_id) : undefined,
          costo_operacion: costo_operacion ? Number(costo_operacion) : undefined,
          observaciones,
          fecha_fin: isClosing ? new Date() : estado ? null : undefined
        }
      });

      const newProgress = await calculateProjectProgress(projectId, tx);
      await tx.proyectoEspecial.update({
        where: { id: projectId },
        data: { porcentaje_avance: newProgress }
      });

      return { ...updated, porcentaje_avance: newProgress };
    });

    res.json(updatedFase);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const transitionFase = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    const targetPhaseId = Number(req.body.fase_destino_id);
    if (!Number.isInteger(projectId) || !Number.isInteger(targetPhaseId)) {
      return res.status(400).json({ message: 'El proyecto y la fase destino deben ser válidos' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const proyecto = await tx.proyectoEspecial.findUnique({
        where: { id: projectId },
        include: { fases: { orderBy: { secuencia: 'asc' } } },
      });
      if (!proyecto) {
        const error = new Error('Proyecto no encontrado');
        (error as any).statusCode = 404;
        throw error;
      }
      if (['Verificación', 'Finalizado'].includes(proyecto.estado)) {
        const error = new Error('El proyecto está bloqueado para cambios');
        (error as any).statusCode = 409;
        throw error;
      }

      const targetPhase = proyecto.fases.find((phase) => phase.id === targetPhaseId);
      if (!targetPhase) {
        const error = new Error('La fase destino no pertenece al proyecto');
        (error as any).statusCode = 404;
        throw error;
      }

      const activePhase = proyecto.fases.find((phase) => phase.estado === 'En Progreso');
      if (activePhase?.id !== targetPhase.id) {
        if (activePhase) {
          await tx.faseProyecto.update({
            where: { id: activePhase.id },
            data: { estado: 'Completada', fecha_fin: new Date() },
          });
        }
        await tx.faseProyecto.update({
          where: { id: targetPhase.id },
          data: { estado: 'En Progreso', fecha_fin: null },
        });
      }

      const porcentaje_avance = await calculateProjectProgress(projectId, tx);
      const updatedProject = await tx.proyectoEspecial.update({
        where: { id: projectId },
        data: { estado: 'En proceso', porcentaje_avance },
        include: { fases: { orderBy: { secuencia: 'asc' } } },
      });

      const userId = Number((req as any).user?.id);
      if (Number.isInteger(userId) && activePhase?.id !== targetPhase.id) {
        await tx.historialCambios.create({
          data: {
            proyecto_id: projectId,
            usuario_id: userId,
            descripcion: `Fase activa cambiada de "${activePhase?.nombre || 'Sin fase'}" a "${targetPhase.nombre}".`,
          },
        });
      }

      return updatedProject;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || (error.code === 'P2034' ? 409 : 500)).json({ message: error.message });
  }
};

export const addFase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, responsable, horas_estimadas, fecha_inicio, estado } = req.body;

    if (typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({ message: 'El nombre de la fase es obligatorio' });
    }

    const newFase = await prisma.$transaction(async (tx) => {
      const projectId = Number(id);
      const proyecto = await tx.proyectoEspecial.findUnique({ where: { id: projectId }, select: { id: true } });
      if (!proyecto) {
        const error = new Error('Proyecto no encontrado');
        (error as any).statusCode = 404;
        throw error;
      }

      const ultimaFase = await tx.faseProyecto.findFirst({
        where: { proyecto_id: projectId },
        orderBy: { secuencia: 'desc' },
        select: { secuencia: true },
      });
      const created = await tx.faseProyecto.create({
        data: {
          proyecto_id: projectId,
          nombre: nombre.trim(),
          secuencia: (ultimaFase?.secuencia || 0) + 10,
          responsable: responsable || '',
          horas_estimadas: Number(horas_estimadas) || 0,
          fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : new Date(),
          estado: estado || 'Pendiente',
        }
      });

      const newProgress = await calculateProjectProgress(projectId, tx);
      await tx.proyectoEspecial.update({ where: { id: projectId }, data: { porcentaje_avance: newProgress } });
      return created;
    });

    res.status(201).json(newFase);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const deleteFase = async (req: Request, res: Response) => {
  try {
    const { id, faseId } = req.params;

    // Check if phase can be deleted (no associated records)
    // For simplicity, we check if there are pieces records or materials linked to this phase
    // But since materials and pieces are linked to the project, not the phase, 
    // we might want to check if the phase has observations or real hours.
    const fase = await getPhaseInProject(Number(id), Number(faseId));

    if (fase.horas_reales && Number(fase.horas_reales) > 0) {
      return res.status(400).json({ message: 'No se puede eliminar una fase que ya tiene horas reales registradas.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.faseProyecto.delete({ where: { id: Number(faseId) } });
      const newProgress = await calculateProjectProgress(Number(id), tx);
      await tx.proyectoEspecial.update({
        where: { id: Number(id) },
        data: { porcentaje_avance: newProgress }
      });
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProyecto = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = Number(id);
    if (!Number.isInteger(projectId)) return res.status(400).json({ message: 'Identificador de proyecto inválido' });

    const piezas = await prisma.piezaProyecto.findMany({ where: { proyecto_id: projectId }, select: { id: true } });
    const pieceIds = piezas.map((pieza) => pieza.id);

    const transaction = await prisma.$transaction([
      prisma.registroPieza.deleteMany({ where: { pieza_id: { in: pieceIds } } }),
      prisma.piezaProyecto.deleteMany({ where: { proyecto_id: projectId } }),
      prisma.materialRequeridoProyecto.deleteMany({ where: { proyecto_id: projectId } }),
      prisma.cargaMaquina.deleteMany({ where: { proyecto_id: projectId } }),
      prisma.historialCambios.deleteMany({ where: { proyecto_id: projectId } }),
      prisma.archivoAdjunto.deleteMany({ where: { proyecto_id: projectId } }),
      prisma.notaTecnica.deleteMany({ where: { proyecto_id: projectId } }),
      prisma.faseProyecto.deleteMany({ where: { proyecto_id: projectId } }),
      prisma.proyectoEspecial.delete({ where: { id: projectId } }),
    ]);

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }
    res.status(500).json({ message: error.message });
  }
};

export const generateProyectoPDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const proyecto = await prisma.proyectoEspecial.findUnique({
      where: { id: Number(id) },
      include: {
        fases: {
          include: {
            maquina: true,
            personal: true
          }
        }
      }
    });

    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    const { generateSpecialProjectPDF } = require('../utils/pdfGenerator');
    // We assume pdfGenerator has a generateSpecialProjectPDF method that handles the layout
    const doc = await generateSpecialProjectPDF(proyecto, res);
    
    // the callback inside generateSpecialProjectPDF handles res.end()
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Error generating PDF', error: error.message });
  }
};

export const addNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { contenido, autor } = req.body;
    
    if (!contenido || !autor) return res.status(400).json({ message: 'Contenido y autor son obligatorios' });

    const nota = await prisma.notaTecnica.create({
      data: {
        proyecto_id: Number(id),
        autor,
        contenido,
      }
    });

    res.status(201).json(nota);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMaterials = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { materiales } = req.body;
    const projectId = Number(id);

    if (!Number.isInteger(projectId) || !Array.isArray(materiales)) {
      return res.status(400).json({ message: 'La lista de materiales no es válida' });
    }

    const updatedMateriales = await prisma.$transaction(async (tx) => {
      const proyecto = await tx.proyectoEspecial.findUnique({ where: { id: projectId }, select: { id: true } });
      if (!proyecto) {
        const error = new Error('Proyecto no encontrado');
        (error as any).statusCode = 404;
        throw error;
      }

      const existentes = await tx.materialRequeridoProyecto.findMany({ where: { proyecto_id: projectId }, select: { id: true } });
      const existingIds = new Set(existentes.map((material) => material.id));
      const retainedIds: number[] = [];

      for (const material of materiales) {
        const descripcion = typeof material.descripcion === 'string' ? material.descripcion.trim() : '';
        const cantidad = material.cantidad === undefined ? 1 : Number(material.cantidad);
        const pesoKg = material.peso_kg === undefined ? 0 : Number(material.peso_kg);
        if (!descripcion || !Number.isFinite(cantidad) || cantidad <= 0 || !Number.isFinite(pesoKg) || pesoKg < 0) {
          const error = new Error('Cada material requiere descripción, cantidad positiva y peso no negativo');
          (error as any).statusCode = 400;
          throw error;
        }

        const data = {
          descripcion,
          tipo: material.tipo || null,
          cantidad,
          peso_kg: pesoKg,
          estado: material.estado || 'Pendiente',
          observaciones: material.observaciones || null,
        };

        if (material.id !== undefined && material.id !== null) {
          const materialId = Number(material.id);
          if (!existingIds.has(materialId)) {
            const error = new Error('El material no pertenece a este proyecto');
            (error as any).statusCode = 400;
            throw error;
          }
          await tx.materialRequeridoProyecto.update({ where: { id: materialId }, data });
          retainedIds.push(materialId);
        } else {
          const created = await tx.materialRequeridoProyecto.create({ data: { ...data, proyecto_id: projectId } });
          retainedIds.push(created.id);
        }
      }

      await tx.materialRequeridoProyecto.deleteMany({
        where: { proyecto_id: projectId, ...(retainedIds.length ? { id: { notIn: retainedIds } } : {}) },
      });

      return tx.materialRequeridoProyecto.findMany({ where: { proyecto_id: projectId }, orderBy: { id: 'asc' } });
    });

    res.json(updatedMateriales);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const uploadAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No se subió ningún archivo' });
    }

    const file = req.file as any;
    const result = await uploadToCloudinary(file.buffer, 'special-projects');
    const url_archivo = result.secure_url;

    const newAttachment = await prisma.archivoAdjunto.create({
      data: {
        proyecto_id: Number(id),
        nombre_archivo: file.originalname,
        url_archivo,
      }
    });

    res.status(201).json(newAttachment);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// --- PIECES CONTROL ---

export const getPieces = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pieces = await prisma.piezaProyecto.findMany({
      where: { proyecto_id: Number(id) },
      include: { registros: { orderBy: { fecha: 'desc' } } }
    });
    res.json(pieces);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addPiece = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      nombre, 
      cantidad, 
      requiere_montaje, 
      observaciones,
      tipo_material,
      largo,
      ancho,
      espesor,
      diametro
    } = req.body;
    
    let plano_url_1 = null;
    let plano_url_2 = null;

    if (req.files) {
      const files = req.files as any;
      if (files['plano_1'] && files['plano_1'].length > 0) {
        const result = await uploadToCloudinary(files['plano_1'][0].buffer, 'special-projects');
        plano_url_1 = result.secure_url;
      }
      if (files['plano_2'] && files['plano_2'].length > 0) {
        const result = await uploadToCloudinary(files['plano_2'][0].buffer, 'special-projects');
        plano_url_2 = result.secure_url;
      }
    }

    const pieceData: any = {
      proyecto_id: Number(id),
      nombre,
      cantidad: Number(cantidad) || 1,
      requiere_montaje: requiere_montaje === 'true' || requiere_montaje === true,
      observaciones,
      estado_montaje: 'Pendiente',
      avance_fabricacion: 0,
      tipo_material,
      largo: largo ? Number(largo) : null,
      ancho: ancho ? Number(ancho) : null,
      espesor: espesor ? Number(espesor) : null,
      diametro: diametro ? Number(diametro) : null,
    };

    if (plano_url_1) pieceData.plano_url_1 = plano_url_1;
    if (plano_url_2) pieceData.plano_url_2 = plano_url_2;

    console.log('Creating piece with data:', pieceData);

    const newPiece = await prisma.piezaProyecto.create({
      data: pieceData
    });

    res.status(201).json(newPiece);
  } catch (error: any) {
    console.error('Add piece error details:', error);
    res.status(500).json({ 
      message: error.message,
      detail: 'Error en la base de datos o en la validación del modelo'
    });
  }
};

export const addPiecesBulk = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    const { requestId, rows } = req.body;

    if (!Number.isInteger(projectId) || typeof requestId !== 'string' || !requestId.trim() || !Array.isArray(rows) || rows.length === 0 || rows.length > 200) {
      return res.status(400).json({ message: 'La carga requiere un identificador y entre 1 y 200 piezas' });
    }

    const preparedRows = rows.map((row: any, index: number) => {
      const nombre = typeof row.nombre === 'string' ? row.nombre.trim() : '';
      const cantidad = row.cantidad === undefined || row.cantidad === '' ? 1 : Number(row.cantidad);
      const dimensions = ['largo', 'ancho', 'espesor', 'diametro'].map((field) => {
        if (row[field] === undefined || row[field] === '') return null;
        const value = Number(row[field]);
        if (!Number.isFinite(value) || value < 0) throw new Error(`Dimensión inválida en la fila ${index + 1}`);
        return value;
      });

      if (!nombre || !Number.isInteger(cantidad) || cantidad < 1) {
        throw new Error(`La fila ${index + 1} requiere nombre y cantidad entera positiva`);
      }

      return {
        proyecto_id: projectId,
        codigo: typeof row.codigo === 'string' && row.codigo.trim() ? row.codigo.trim() : null,
          clave_idempotencia: `${projectId}:${requestId.trim()}:${index}`,
        nombre,
        cantidad,
        requiere_montaje: row.requiere_montaje === true || row.requiere_montaje === 'true',
        observaciones: typeof row.observaciones === 'string' ? row.observaciones.trim() || null : null,
        tipo_material: typeof row.tipo_material === 'string' ? row.tipo_material.trim() || null : null,
        largo: dimensions[0],
        ancho: dimensions[1],
        espesor: dimensions[2],
        diametro: dimensions[3],
      };
    });

    const codes = preparedRows.flatMap((row) => row.codigo ? [row.codigo] : []);
    if (new Set(codes).size !== codes.length) {
      return res.status(400).json({ message: 'Hay códigos de pieza repetidos en la carga' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const proyecto = await tx.proyectoEspecial.findUnique({ where: { id: projectId }, select: { id: true } });
      if (!proyecto) {
        const error = new Error('Proyecto no encontrado');
        (error as any).statusCode = 404;
        throw error;
      }

      const keys = preparedRows.map((row) => row.clave_idempotencia);
      const existingRows = await tx.piezaProyecto.findMany({ where: { clave_idempotencia: { in: keys } } });
      if (existingRows.length < preparedRows.length && codes.length > 0) {
        const existingCodes = await tx.piezaProyecto.findMany({
          where: { proyecto_id: projectId, codigo: { in: codes }, clave_idempotencia: { notIn: keys } },
          select: { codigo: true },
        });
        if (existingCodes.length > 0) {
          const error = new Error(`Ya existe el código ${existingCodes[0].codigo} en este proyecto`);
          (error as any).statusCode = 409;
          throw error;
        }
      }

      await tx.piezaProyecto.createMany({ data: preparedRows, skipDuplicates: true });
      const piezas = await tx.piezaProyecto.findMany({
        where: { clave_idempotencia: { in: keys } },
        orderBy: { id: 'asc' },
      });

      return { piezas, existentes: existingRows.length };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    res.status(201).json({ ...result, creadas: result.piezas.length - result.existentes });
  } catch (error: any) {
    res.status(error.statusCode || (error.code === 'P2034' ? 409 : 400)).json({ message: error.message });
  }
};

export const addPieceRecord = async (req: Request, res: Response) => {
  try {
    const { pieceId } = req.params;
    const { tipo, descripcion, avance_reportado, clave_idempotencia, cantidad_buena, cantidad_mala, cantidad_retrabajo } = req.body;
    const id = Number(pieceId);
    const progress = avance_reportado === undefined || avance_reportado === '' ? null : Number(avance_reportado);
    const quantities = [cantidad_buena, cantidad_mala, cantidad_retrabajo].map((value) => value === undefined ? 0 : Number(value));
    const hasQuantityReport = [cantidad_buena, cantidad_mala, cantidad_retrabajo].some((value) => value !== undefined);

    if (!Number.isInteger(id) || !['FABRICACION', 'MONTAJE'].includes(tipo) || typeof descripcion !== 'string' || !descripcion.trim()) {
      return res.status(400).json({ message: 'El registro requiere una pieza, tipo y descripción válidos' });
    }
    if ((progress !== null && (!Number.isFinite(progress) || progress < 0 || progress > 100)) || quantities.some((value) => !Number.isInteger(value) || value < 0)) {
      return res.status(400).json({ message: 'El avance debe estar entre 0 y 100 y las cantidades no pueden ser negativas' });
    }
    if (hasQuantityReport && quantities.every((value) => value === 0)) {
      return res.status(400).json({ message: 'Registra al menos una pieza buena, rechazada o en retrabajo' });
    }

    if (clave_idempotencia) {
      const existingRecord = await prisma.registroPieza.findUnique({ where: { clave_idempotencia } });
      if (existingRecord) return res.json(existingRecord);
    }

    const newRecord = await prisma.$transaction(async (tx) => {
      const piece = await tx.piezaProyecto.findUnique({ where: { id } });
      if (!piece) {
        const error = new Error('Pieza no encontrada');
        (error as any).statusCode = 404;
        throw error;
      }

      if (tipo === 'FABRICACION' && hasQuantityReport) {
        const totals = await tx.registroPieza.aggregate({
          where: { pieza_id: id, tipo: 'FABRICACION' },
          _sum: { cantidad_buena: true, cantidad_mala: true },
        });
        const alreadyProcessed = Number(totals._sum.cantidad_buena || 0) + Number(totals._sum.cantidad_mala || 0);
        if (alreadyProcessed + quantities[0] + quantities[1] > piece.cantidad) {
          const error = new Error(`El reporte supera las ${piece.cantidad} unidades planificadas para esta pieza`);
          (error as any).statusCode = 400;
          throw error;
        }
      }

      const record = await tx.registroPieza.create({
        data: {
          pieza_id: id,
          tipo,
          descripcion: descripcion.trim(),
          avance_reportado: progress,
          cantidad_buena: quantities[0],
          cantidad_mala: quantities[1],
          cantidad_retrabajo: quantities[2],
          clave_idempotencia: clave_idempotencia || null,
        }
      });

      if (tipo === 'FABRICACION' && hasQuantityReport) {
        const totals = await tx.registroPieza.aggregate({
          where: { pieza_id: id, tipo: 'FABRICACION' },
          _sum: { cantidad_buena: true, cantidad_mala: true },
        });
        const procesadas = Number(totals._sum.cantidad_buena || 0) + Number(totals._sum.cantidad_mala || 0);
        const avanceFabricacion = piece.cantidad > 0 ? Math.min((procesadas / piece.cantidad) * 100, 100) : 0;
        await tx.piezaProyecto.update({ where: { id }, data: { avance_fabricacion: Math.max(piece.avance_fabricacion, avanceFabricacion) } });
      } else if (tipo === 'FABRICACION' && progress !== null) {
        await tx.piezaProyecto.update({ where: { id }, data: { avance_fabricacion: Math.min(piece.avance_fabricacion + progress, 100) } });
      }

      if (tipo === 'MONTAJE' && descripcion.toLowerCase().includes('complet')) {
        await tx.piezaProyecto.update({ where: { id }, data: { estado_montaje: 'Completado' } });
      }

      const newProgress = await calculateProjectProgress(piece.proyecto_id, tx);
      await tx.proyectoEspecial.update({ where: { id: piece.proyecto_id }, data: { porcentaje_avance: newProgress } });
      return record;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    res.status(201).json(newRecord);
  } catch (error: any) {
    if (error.code === 'P2002' && req.body.clave_idempotencia) {
      const existingRecord = await prisma.registroPieza.findUnique({ where: { clave_idempotencia: req.body.clave_idempotencia } });
      if (existingRecord) return res.json(existingRecord);
    }
    res.status(error.statusCode || (['P2002', 'P2034'].includes(error.code) ? 409 : 500)).json({ message: error.message });
  }
};

export const deletePiece = async (req: Request, res: Response) => {
  try {
    const { pieceId } = req.params;
    await prisma.registroPieza.deleteMany({ where: { pieza_id: Number(pieceId) } });
    await prisma.piezaProyecto.delete({ where: { id: Number(pieceId) } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
export const updatePiece = async (req: Request, res: Response) => {
  try {
    const { pieceId } = req.params;
    const { 
      nombre, 
      cantidad, 
      requiere_montaje, 
      observaciones,
      tipo_material,
      largo,
      ancho,
      espesor,
      diametro,
      userId
    } = req.body;

    const currentPiece = await prisma.piezaProyecto.findUnique({ where: { id: Number(pieceId) } });
    if (!currentPiece) return res.status(404).json({ message: 'Pieza no encontrada' });

    let plano_url_1 = undefined;
    let plano_url_2 = undefined;

    if (req.files) {
      const files = req.files as any;
      if (files['plano_1'] && files['plano_1'].length > 0) {
        const result = await uploadToCloudinary(files['plano_1'][0].buffer, 'special-projects');
        plano_url_1 = result.secure_url;
      }
      if (files['plano_2'] && files['plano_2'].length > 0) {
        const result = await uploadToCloudinary(files['plano_2'][0].buffer, 'special-projects');
        plano_url_2 = result.secure_url;
      }
    }

    const pieceData: any = {
      nombre,
      cantidad: cantidad ? Number(cantidad) : undefined,
      requiere_montaje: requiere_montaje !== undefined ? (requiere_montaje === 'true' || requiere_montaje === true) : undefined,
      observaciones,
      tipo_material,
      largo: largo ? Number(largo) : undefined,
      ancho: ancho ? Number(ancho) : undefined,
      espesor: espesor ? Number(espesor) : undefined,
      diametro: diametro ? Number(diametro) : undefined,
      plano_url_1,
      plano_url_2
    };

    const updatedPiece = await prisma.piezaProyecto.update({
      where: { id: Number(pieceId) },
      data: pieceData
    });

    // Registrar en el historial si se proporciona userId
    if (userId) {
      await prisma.historialCambios.create({
        data: {
          proyecto_id: currentPiece.proyecto_id,
          usuario_id: Number(userId),
          descripcion: `Se actualizó la pieza: ${currentPiece.nombre}`
        }
      });
    }

    res.json(updatedPiece);
  } catch (error: any) {
    console.error('Update piece error:', error);
    res.status(500).json({ message: error.message });
  }
};
