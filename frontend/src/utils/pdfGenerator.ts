import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BASE_URL } from '../api';

export const generateOrderPDF = async (order: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Helper to load logo from server
    const loadLogo = async () => {
        try {
            const logoUrl = `${BASE_URL}/public/Logo_MT.PNG`;
            const response = await fetch(logoUrl);
            if (!response.ok) return null;
            const blob = await response.blob();
            return await new Promise<string | null>(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error loading logo:', error);
            return null;
        }
    };

    if (order.tipo_orden === 'PROYECTO_ESPECIAL') {
        // PROYECTO_ESPECIAL layout (FP-008 inspired)
        const logo = await loadLogo();

        // Header with logo and company info
        let yPos = 10;
        if (logo) {
            doc.addImage(logo, 'PNG', 15, 5, 25, 25);
        }

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('MECO & TRO', 50, 15);
        doc.text('MECANIZADOS Y TROQUELADOS S.A.S', 50, 22);

        // Order number on right
        doc.setFontSize(18);
        doc.text(`OT No. ${order.numero_ot}`, pageWidth - 15, 15, { align: 'right' });
        doc.setFontSize(9);
        doc.text('REV 1 - 2025/02/18', pageWidth - 15, 22, { align: 'right' });
        doc.text('ORDEN DE TRABAJO', pageWidth - 15, 29, { align: 'right' });

        // Header table
        yPos = 35;
        autoTable(doc, {
            startY: yPos,
            margin: 15,
            head: [
                [
                    'TIPO DE PROYECTO',
                    'CLIENTE:',
                    order.cliente || 'N/A',
                    'PLAZO ENTREGA',
                    new Date(order.fecha_entrega_req || Date.now()).toLocaleDateString()
                ]
            ],
            body: [
                [
                    'PROYECTO ESPECIAL',
                    'FECHA OT:',
                    new Date(order.fecha_creacion || Date.now()).toLocaleDateString(),
                    'PRIORIDAD',
                    order.prioridad || 'ESTANDAR'
                ]
            ],
            theme: 'grid',
            headStyles: { fillColor: [144, 202, 249], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 28 },
                2: { cellWidth: 32 },
                3: { cellWidth: 28 },
                4: { cellWidth: 42 }
            }
        });

        yPos = (doc as any).lastAutoTable.finalY + 5;

        // Project description
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text('DESCRIPCIÓN DEL PROYECTO O PRODUCTOS SERIADOS', 15, yPos);
        yPos += 5;

        const projectDesc = order.descripcion_proyecto || `Proyecto ${order.numero_ot}`;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        const splitText = doc.splitTextToSize(projectDesc, pageWidth - 30);
        doc.text(splitText, 15, yPos);
        yPos += splitText.length * 4 + 3;

        // Materials table if present
        if (order.materialesProyecto && order.materialesProyecto.length > 0) {
            doc.setFont(undefined, 'bold');
            doc.setFontSize(9);
            doc.text('MATERIALES', 15, yPos);
            yPos += 5;

            const materialRows = order.materialesProyecto.map((m: any) => [
                m.cantidad?.toString() || '',
                m.unidad || '',
                m.descripcion || '',
                m.especificaciones || '',
                m.ancho_tira || ''
            ]);

            autoTable(doc, {
                startY: yPos,
                margin: 15,
                head: [['CANT', 'UND', 'DESCRIPCION Y ESPECIFICACIONES DEL MATERIAL', 'ESP', 'ANCHO DE TIRA']],
                body: materialRows,
                theme: 'grid',
                headStyles: { fillColor: [51, 51, 51], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
                bodyStyles: { fontSize: 7 },
                columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 10 }, 2: { cellWidth: 110 }, 3: { cellWidth: 15 }, 4: { cellWidth: 25 } }
            });
            yPos = (doc as any).lastAutoTable.finalY + 3;
        }

        // Manufacturing route (tasks / operations)
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text('RUTA DEL PRODUCTO', 15, yPos);
        yPos += 3;

        const taskRows = order.tareas.map((t: any) => [
            t.rutaFabricacion?.no_operacion?.toString() || '--',
            t.rutaFabricacion?.nombre_operacion || '',
            t.rutaFabricacion?.centro_trabajo || '',
            '',
            ''
        ]);

        autoTable(doc, {
            startY: yPos,
            margin: 15,
            head: [['OP', 'OPERACION', 'CENTRO DE TRABAJO / MAQUINA', 'PIEZAS POR H', 'OBSERVACION']],
            body: taskRows,
            theme: 'grid',
            headStyles: { fillColor: [51, 51, 51], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 7 },
            columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 100 }, 2: { cellWidth: 35 }, 3: { cellWidth: 15 }, 4: { cellWidth: 22 } }
        });

        doc.save(`${order.numero_ot}_OT_Especial.pdf`);
    } else {
        // PRODUCCION_SERIE layout (current simpler template)
        doc.setFontSize(22);
        doc.text('REPORTE TÉCNICO DE PRODUCCIÓN', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Orden: ${order.numero_ot}`, 20, 35);
        doc.text(`Producto: ${order.producto?.nombre_producto || 'N/A'}`, 20, 42);
        doc.text(`Cliente: ${order.cliente || order.producto?.cliente?.nombre || 'N/A'}`, 20, 49);
        doc.text(
            `Fecha Entrega: ${order.fecha_entrega_req ? new Date(order.fecha_entrega_req).toLocaleDateString() : 'Pendiente'}`,
            20,
            56
        );

        // Table of Tasks
        const tableData = order.tareas.map((t: any) => [
            t.rutaFabricacion?.no_operacion,
            t.rutaFabricacion?.nombre_operacion,
            t.personal?.nombre || 'No asignado',
            t.maquina?.codigo || 'No asignada',
            t.estado_tarea,
            t.cantidad_buena || 0,
            t.cantidad_mala || 0,
            t.fecha_hora_inicio ? new Date(t.fecha_hora_inicio).toLocaleTimeString() : '--',
            t.fecha_hora_fin ? new Date(t.fecha_hora_fin).toLocaleTimeString() : '--'
        ]);

        autoTable(doc, {
            startY: 65,
            head: [['Op', 'Actividad', 'Operario', 'Máquina', 'Estado', 'Ok', 'Scrap', 'I', 'F']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] }
        });

        doc.save(`${order.numero_ot}_Reporte.pdf`);
    }
};
