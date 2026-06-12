import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getProyectos = async (req: Request, res: Response) => {
  try {
    const proyectos = await prisma.proyectoEspecial.findMany({
      include: {
        fases: true,
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
        fases: true,
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
        foto_referencia_url = `/uploads/special-projects/${files['foto_referencia'][0].filename}`;
      }
      if (files['plano_pdf'] && files['plano_pdf'].length > 0) {
        plano_pdf_url = `/uploads/special-projects/${files['plano_pdf'][0].filename}`;
      }
    }

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

    const { fases } = req.body;
    let parsedFases = [];
    if (fases) {
      try {
        parsedFases = typeof fases === 'string' ? JSON.parse(fases) : fases;
      } catch (e) {
        console.error('Error parsing fases', e);
      }
    }

    // Default phases if none provided
    if (parsedFases.length === 0) {
      parsedFases = [
        { nombre: 'Diseño', responsable: 'Andrés Mejía', horas_estimadas: 0, fecha_inicio: new Date(), estado: 'Pendiente' },
        { nombre: 'Materiales', responsable: responsable_tecnico, horas_estimadas: 0, fecha_inicio: new Date(), estado: 'Pendiente' },
        { nombre: 'Programación', responsable: responsable_tecnico, horas_estimadas: 0, fecha_inicio: new Date(), estado: 'Pendiente' },
        { nombre: 'Fabricación', responsable: responsable_tecnico, horas_estimadas: 0, fecha_inicio: new Date(), estado: 'Pendiente' },
        { nombre: 'Ajuste', responsable: responsable_tecnico, horas_estimadas: 0, fecha_inicio: new Date(), estado: 'Pendiente' },
        { nombre: 'Prueba', responsable: responsable_tecnico, horas_estimadas: 0, fecha_inicio: new Date(), estado: 'Pendiente' },
        { nombre: 'Cierre', responsable: responsable_tecnico, horas_estimadas: 0, fecha_inicio: new Date(), estado: 'Pendiente' },
      ];
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
          create: parsedFases.map((f: any) => ({
            nombre: f.nombre,
            responsable: f.nombre === 'Diseño' ? 'Andrés Mejía' : (f.responsable || responsable_tecnico),
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
    let { userId, fases, ...dataToUpdate } = req.body;

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
        prismaData.foto_referencia_url = `/uploads/special-projects/${files['foto_referencia'][0].filename}`;
      }
      if (files['plano_pdf'] && files['plano_pdf'].length > 0) {
        prismaData.plano_pdf_url = `/uploads/special-projects/${files['plano_pdf'][0].filename}`;
      }
    }

    const proyectoActual = await prisma.proyectoEspecial.findUnique({
      where: { id: Number(id) },
      include: { fases: { orderBy: { id: 'asc' } } },
    });

    if (!proyectoActual) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Regla: No permitir cambiar de fase sin cerrar la anterior
    if (parsedFases && Array.isArray(parsedFases)) {
      for (let i = 0; i < parsedFases.length; i++) {
        const faseActualizada = parsedFases[i];
        const faseOriginal = proyectoActual.fases.find((f: any) => f.id === faseActualizada.id);

        if (faseOriginal && faseActualizada.estado !== faseOriginal.estado && faseActualizada.estado !== 'Cerrada') {
          const indexOriginal = proyectoActual.fases.findIndex((f: any) => f.id === faseOriginal.id);
          if (indexOriginal > 0) {
            const faseAnterior = proyectoActual.fases[indexOriginal - 1];
            if (faseAnterior.estado !== 'Cerrada' && faseAnterior.estado !== 'Completada') {
              return res.status(400).json({
                message: `No se puede cambiar el estado de la fase "${faseActualizada.nombre}" sin haber finalizado la fase anterior "${faseAnterior.nombre}".`,
              });
            }
          }
        }
        
        // Update phases recursively or individually for specific fields
        await prisma.faseProyecto.update({
          where: { id: faseActualizada.id },
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
    if (userId) {
      let descripcionCambio = 'El proyecto fue actualizado.';
      if (dataToUpdate.estado && dataToUpdate.estado !== proyectoActual.estado) {
        descripcionCambio = `El estado del proyecto cambió de "${proyectoActual.estado}" a "${dataToUpdate.estado}".`;
      }

      await prisma.historialCambios.create({
        data: {
          proyecto_id: Number(id),
          usuario_id: Number(userId),
          descripcion: descripcionCambio,
        },
      });
    }

    res.json(updatedProyecto);
  } catch (error: any) {
    console.error('Update project error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Utility to calculate project progress
const calculateProjectProgress = async (projectId: number) => {
  const परियोजना = await prisma.proyectoEspecial.findUnique({
    where: { id: projectId },
    include: {
      fases: true,
      piezas: true
    }
  });

  if (!परियोजना) return 0;

  // Base calculation: % of completed phases (each phase is 100/6 = ~16.6%)
  // But we can refine it: if there are pieces, use piece progress for 'Fabricación' phase
  const totalFases = परियोजना.fases.length;
  const fasesCompletadas = परियोजना.fases.filter(f => f.estado === 'Completada' || f.estado === 'Cerrada').length;
  
  let progress = (fasesCompletadas / totalFases) * 100;

  // If there are pieces and fabrication is 'En Progreso', adjust slightly based on piece average
  if (परियोजना.piezas.length > 0) {
    const avgPieceAvance = परियोजना.piezas.reduce((acc, p) => acc + (p.avance_fabricacion || 0), 0) / परियोजना.piezas.length;
    // Fabrication is usually phase 3 (index 2)
    const fabricacionFase = परियोजना.fases.find(f => f.nombre === 'Fabricación');
    if (fabricacionFase && fabricacionFase.estado === 'En Progreso') {
       // Optionally adjust total progress here
    }
  }

  return Math.min(Math.round(progress), 100);
};

export const updateFase = async (req: Request, res: Response) => {
  try {
    const { id, faseId } = req.params;
    const { estado, responsable, horas_reales, maquina_id, personal_id, costo_operacion, observaciones } = req.body;

    const updatedFase = await prisma.faseProyecto.update({
      where: { id: Number(faseId) },
      data: {
        estado,
        responsable,
        horas_reales: horas_reales ? Number(horas_reales) : undefined,
        maquina_id: maquina_id ? Number(maquina_id) : undefined,
        personal_id: personal_id ? Number(personal_id) : undefined,
        costo_operacion: costo_operacion ? Number(costo_operacion) : undefined,
        observaciones,
        fecha_fin: (estado === 'Completada' || estado === 'Cerrada') ? new Date() : undefined
      }
    });

    // Recalculate project progress
    const newProgress = await calculateProjectProgress(Number(id));
    await prisma.proyectoEspecial.update({
      where: { id: Number(id) },
      data: { porcentaje_avance: newProgress }
    });

    res.json(updatedFase);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addFase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, responsable, horas_estimadas, fecha_inicio, estado } = req.body;

    const newFase = await prisma.faseProyecto.create({
      data: {
        proyecto_id: Number(id),
        nombre,
        responsable: nombre === 'Diseño' ? 'Andrés Mejía' : (responsable || ''),
        horas_estimadas: Number(horas_estimadas) || 0,
        fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : new Date(),
        estado: estado || 'Pendiente',
      }
    });

    // Recalculate progress
    const newProgress = await calculateProjectProgress(Number(id));
    await prisma.proyectoEspecial.update({
      where: { id: Number(id) },
      data: { porcentaje_avance: newProgress }
    });

    res.status(201).json(newFase);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteFase = async (req: Request, res: Response) => {
  try {
    const { id, faseId } = req.params;

    // Check if phase can be deleted (no associated records)
    // For simplicity, we check if there are pieces records or materials linked to this phase
    // But since materials and pieces are linked to the project, not the phase, 
    // we might want to check if the phase has observations or real hours.
    const fase = await prisma.faseProyecto.findUnique({
      where: { id: Number(faseId) }
    });

    if (!fase) return res.status(404).json({ message: 'Fase no encontrada' });

    if (fase.horas_reales && Number(fase.horas_reales) > 0) {
      return res.status(400).json({ message: 'No se puede eliminar una fase que ya tiene horas reales registradas.' });
    }

    await prisma.faseProyecto.delete({
      where: { id: Number(faseId) }
    });

    // Recalculate progress
    const newProgress = await calculateProjectProgress(Number(id));
    await prisma.proyectoEspecial.update({
      where: { id: Number(id) },
      data: { porcentaje_avance: newProgress }
    });

    res.status(204).send();
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
    const { materiales } = req.body; // Array de { descripcion, peso_kg, observaciones }

    // Reemplazamos todos los materiales
    await prisma.materialRequeridoProyecto.deleteMany({
      where: { proyecto_id: Number(id) }
    });

    if (materiales && Array.isArray(materiales) && materiales.length > 0) {
      await prisma.materialRequeridoProyecto.createMany({
        data: materiales.map((m: any) => ({
          proyecto_id: Number(id),
          descripcion: m.descripcion,
          tipo: m.tipo,
          cantidad: m.cantidad ? Number(m.cantidad) : 1,
          peso_kg: m.peso_kg ? Number(m.peso_kg) : 0,
          estado: m.estado || "Pendiente",
          observaciones: m.observaciones
        }))
      });
    }

    const updatedMateriales = await prisma.materialRequeridoProyecto.findMany({
      where: { proyecto_id: Number(id) }
    });

    res.json(updatedMateriales);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No se subió ningún archivo' });
    }

    const file = req.file as any;
    const url_archivo = `/uploads/special-projects/${file.filename}`;

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
        plano_url_1 = `/uploads/special-projects/${files['plano_1'][0].filename}`;
      }
      if (files['plano_2'] && files['plano_2'].length > 0) {
        plano_url_2 = `/uploads/special-projects/${files['plano_2'][0].filename}`;
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

export const addPieceRecord = async (req: Request, res: Response) => {
  try {
    const { pieceId } = req.params;
    const { tipo, descripcion, avance_reportado } = req.body;

    const piece = await prisma.piezaProyecto.findUnique({ where: { id: Number(pieceId) } });
    if (!piece) return res.status(404).json({ message: 'Pieza no encontrada' });

    const newRecord = await prisma.registroPieza.create({
      data: {
        pieza_id: Number(pieceId),
        tipo,
        descripcion,
        avance_reportado: avance_reportado ? Number(avance_reportado) : null
      }
    });

    // If it's a FABRICACION record, update the piece's cumulative progress
    if (tipo === 'FABRICACION' && avance_reportado !== undefined) {
       // We can either sum or set. Let's assume progress is cumulative but we shouldn't exceed 100.
       const totalAvance = Math.min((piece.avance_fabricacion || 0) + Number(avance_reportado), 100);
       await prisma.piezaProyecto.update({
         where: { id: Number(pieceId) },
         data: { avance_fabricacion: totalAvance }
       });
    }

    // If it's MONTAJE, we could mark as completed if described or just log it
    if (tipo === 'MONTAJE' && descripcion.toLowerCase().includes('complet')) {
       await prisma.piezaProyecto.update({
         where: { id: Number(pieceId) },
         data: { estado_montaje: 'Completado' }
       });
    }

    // Recalculate project progress whenever a piece is updated
    const newProgress = await calculateProjectProgress(Number(piece.proyecto_id));
    await prisma.proyectoEspecial.update({
      where: { id: Number(piece.proyecto_id) },
      data: { porcentaje_avance: newProgress }
    });

    res.status(201).json(newRecord);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
        plano_url_1 = `/uploads/special-projects/${files['plano_1'][0].filename}`;
      }
      if (files['plano_2'] && files['plano_2'].length > 0) {
        plano_url_2 = `/uploads/special-projects/${files['plano_2'][0].filename}`;
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
