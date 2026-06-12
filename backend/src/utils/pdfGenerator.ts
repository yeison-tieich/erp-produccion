import PDFDocument from 'pdfkit';
import { Response } from 'express';

export const generateSpecialProjectPDF = async (proyecto: any, res: Response) => {
  return new Promise<void>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Proyecto_Especial_${proyecto.id}.pdf`
      );

      doc.pipe(res);

      // Header
      doc.fontSize(20).text(`ORDEN DE PROYECTO ESPECIAL: ${proyecto.descripcion_tecnica}`, { align: 'center' });
      doc.moveDown();

      // Project Info
      doc.fontSize(12);
      doc.text(`ID Proyecto: ${proyecto.id}`);
      doc.text(`Cliente: ${proyecto.cliente}`);
      doc.text(`Tipo de Proyecto: ${proyecto.tipo_proyecto}`);
      doc.text(`Responsable Técnico: ${proyecto.responsable_tecnico}`);
      doc.text(`Fecha de Inicio: ${new Date(proyecto.fecha_inicio).toLocaleDateString()}`);
      doc.text(`Fecha de Compromiso: ${new Date(proyecto.fecha_compromiso).toLocaleDateString()}`);
      doc.text(`Prioridad: ${proyecto.prioridad}`);
      doc.text(`Estado: ${proyecto.estado}`);
      doc.moveDown();

      // Phases Table Header
      doc.fontSize(14).text('Control de Procesos (Fases)', { underline: true });
      doc.moveDown(0.5);

      const startY = doc.y;
      doc.fontSize(10);
      
      let y = startY;
      
      // We will draw a simple list or table
      if (proyecto.fases && proyecto.fases.length > 0) {
        proyecto.fases.forEach((fase: any, index: number) => {
            doc.text(`${index + 1}. ${fase.nombre} - Estado: ${fase.estado}`, 50, y);
            y += 15;
            doc.text(`   Responsable: ${fase.personal ? fase.personal.nombre : fase.responsable || 'N/A'}`, 50, y);
            y += 15;
            doc.text(`   Máquina: ${fase.maquina ? fase.maquina.descripcion : 'N/A'}`, 50, y);
            y += 15;
            doc.text(`   Costo Operación: $${fase.costo_operacion || 0}`, 50, y);
            y += 15;
            doc.text(`   Fechas: ${new Date(fase.fecha_inicio).toLocaleDateString()} a ${fase.fecha_fin ? new Date(fase.fecha_fin).toLocaleDateString() : 'En curso'}`, 50, y);
            y += 20;

            if (y > 700) {
                doc.addPage();
                y = 50;
            }
        });
      } else {
        doc.text('No hay fases registradas.');
      }

      doc.end();
      
      res.on('finish', () => {
        resolve();
      });

    } catch (error) {
      reject(error);
    }
  });
};
