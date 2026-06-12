import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BASE_URL } from '../api';

export const generateOrderPDF = async (order: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Load Logo
    const loadLogo = async () => {
        try {
            const logoUrl = `${BASE_URL}/public/Logo.png`;
            const response = await fetch(logoUrl);
            if (!response.ok) return null;
            const blob = await response.blob();
            return await new Promise<string | null>(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        } catch (e) { return null; }
    };

    // 2. Load Piece Image if available
    const loadImage = async (url: string) => {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const blob = await response.blob();
            return await new Promise<string | null>(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        } catch (e) { return null; }
    };

    const logo = await loadLogo();
    const pieceImage = order.imagen_url ? await loadImage(order.imagen_url.startsWith('http') ? order.imagen_url : `${BASE_URL}${order.imagen_url}`) : null;

    // --- HEADER ---
    let yPos = 10;
    if (logo) doc.addImage(logo, 'PNG', 15, 5, 50, 25);


    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`OT No. ${order.numero_ot}`, pageWidth - 15, 15, { align: 'right' });
    doc.setFontSize(9);
    doc.text('FP-008 V1', pageWidth - 15, 22, { align: 'right' });
    doc.setFont(undefined, 'bold');
    doc.text('ORDEN DE TRABAJO', pageWidth - 15, 29, { align: 'right' });

    // --- GENERAL INFO ---
    yPos = 35;
    autoTable(doc, {
        startY: yPos,
        margin: 15,
        head: [['CLIENTE', 'FECHA OT', 'ENTREGA COMPROMETIDA', 'PRIORIDAD']],
        body: [[
            order.cliente || order.producto?.cliente?.nombre || 'N/A',
            new Date(order.fecha_creacion || Date.now()).toLocaleDateString(),
            new Date(order.fecha_entrega_req || Date.now()).toLocaleDateString(),
            order.prioridad || 'ESTANDAR'
        ]],
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8 },
        bodyStyles: { fontSize: 8, fontStyle: 'bold' }
    });

    yPos = (doc as any).lastAutoTable.finalY + 5;

    // ---- TITULO ----
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('DETALLES DEL PRODUCTO / PROYECTO', 15, yPos);
    yPos += 4;

    const productDetails = [
        ['PRODUCTO:', order.producto?.nombre_producto || 'PROYECTO ESPECIAL', 'SKU:', order.producto?.sku_producto || '--'],
        ['TIPO:', order.tipo_orden, 'CANTIDAD:', order.cantidad_fabricar?.toString()],
        ['ACABADO:', order.acabado || order.producto?.acabado || '--', 'ANCHO TIRA:', `${order.ancho_tira || order.producto?.ancho_tira || '--'} mm`],
        ['PZAS/LAMINA:', order.piezas_lamina || order.producto?.piezas_lamina_4x8 || '--', 'EMPAQUE:', order.producto?.empaque_de || '--']
    ];

    // ---- TABLA DE DETALLES (IZQUIERDA) ----
    const tableStartY = yPos;

    autoTable(doc, {
        startY: tableStartY,
        margin: { left: 15, right: 80 }, // deja espacio para imagen
        body: productDetails,
        theme: 'plain',
        bodyStyles: { fontSize: 8, cellPadding: 1 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 30 },
            1: { cellWidth: 40 },
            2: { fontStyle: 'bold', cellWidth: 25 },
            3: { cellWidth: 30 }
        }
    });

    // Image integration
    if (pieceImage) {
        try {
            const imageWidth = 45;
            const imageHeight = 45;
            const imageX = pageWidth - imageWidth - 15;
            const imageY = tableStartY;

            doc.setDrawColor(200);
            doc.rect(imageX - 2, imageY - 2, imageWidth + 4, imageHeight + 4);
            doc.addImage(pieceImage, 'JPEG', imageX, imageY, imageWidth, imageHeight);

            doc.setFontSize(7);
            doc.text('IMAGEN DE LA PIEZA', imageX + imageWidth / 2, imageY + imageHeight + 5, { align: 'center' });
        } catch (e) { }
    }

    yPos = Math.max((doc as any).lastAutoTable.finalY, tableStartY + 50) + 5;

    // --- MATERIALS SECTION ---
    if (order.tipo_orden === 'PROYECTO_ESPECIAL' && order.materialesProyecto?.length > 0) {
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.text('MATERIALES REQUERIDOS', 15, yPos);
        yPos += 2;

        autoTable(doc, {
            startY: yPos,
            margin: 15,
            head: [['CANT', 'UND', 'DESCRIPCION DEL MATERIAL', 'ESPECIFICACIONES']],
            body: order.materialesProyecto.map((m: any) => [m.cantidad, m.unidad, m.descripcion, m.especificaciones || '--']),
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105], fontSize: 8 },
            bodyStyles: { fontSize: 7 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 5;
    } else if (order.producto?.listaMateriales?.length > 0) {
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.text('LISTA DE MATERIALES (BOM)', 15, yPos);
        yPos += 2;

        autoTable(doc, {
            startY: yPos,
            margin: 15,
            head: [['SKU', 'MATERIAL', 'CANT. UNIT', 'TOTAL REQUERIDO', 'UND']],
            body: order.producto.listaMateriales.map((m: any) => [
                m.materiaPrima?.sku_mp,
                m.materiaPrima?.nombre_mp,
                m.cantidad_requerida,
                (Number(m.cantidad_requerida) * Number(order.cantidad_fabricar)).toFixed(2),
                m.materiaPrima?.unidad_medida_stock
            ]),
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105], fontSize: 8 },
            bodyStyles: { fontSize: 7 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 5;
    }

    // --- ROUTE SECTION ---
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('RUTA DE FABRICACIÓN (OPERACIONES)', 15, yPos);
    yPos += 2;

    const routeData = order.tareas.map((t: any, index: number) => [
        (index + 1) * 10,
        t.rutaFabricacion?.nombre_operacion || 'OP SIN NOMBRE',
        t.rutaFabricacion?.centro_trabajo || 'PLANTA',
        t.personal?.nombre || '--',
        t.maquina?.codigo || '--',
        '' // Observations space
    ]);

    // Add empty rows for manual entry
    const nextOp = (order.tareas.length + 1) * 10;
    for (let i = 0; i < 3; i++) {
        routeData.push([nextOp + (i * 10), '', '', '', '', '']);
    }

    autoTable(doc, {
        startY: yPos,
        margin: 15,
        head: [['OP', 'OPERACIÓN', 'CENTRO/MÁQUINA', 'OPERARIO', 'MÁQUINA ID', 'CANTIDAD / FIRMA']],
        body: routeData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 50 },
            2: { cellWidth: 35 },
            3: { cellWidth: 25 },
            4: { cellWidth: 20 },
            5: { cellWidth: 40 }
        }
    });

    // --- FOOTER / SIGNATURES ---
    yPos = (doc as any).lastAutoTable.finalY + 20;
    if (yPos > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        yPos = 30;
    }

    doc.line(15, yPos, 80, yPos);
    doc.line(120, yPos, 185, yPos);
    doc.setFontSize(7);
    doc.text('FIRMA RESPONSABLE PRODUCCIÓN', 15, yPos + 5);
    doc.text('FIRMA CONTROL CALIDAD', 120, yPos + 5);

    doc.save(`${order.numero_ot}_OT.pdf`);
};

export const generateMachineFichaPDF = async (machine: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Load Logo
    const loadLogo = async () => {
        try {
            const logoUrl = `${BASE_URL}/public/Logo.png`;
            const response = await fetch(logoUrl);
            if (!response.ok) return null;
            const blob = await response.blob();
            return await new Promise<string | null>(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        } catch (e) { return null; }
    };

    // 2. Load Machine Image
    const loadImage = async (url: string) => {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const blob = await response.blob();
            return await new Promise<string | null>(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        } catch (e) { return null; }
    };

    const logo = await loadLogo();
    const machineImage = machine.foto_url ? await loadImage(`${BASE_URL}/images/${machine.foto_url}`) : null;

    // --- HEADER ---
    let yPos = 10;
    if (logo) doc.addImage(logo, 'PNG', 15, 5, 50, 25);

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('FICHA TÉCNICA DE ACTIVO', pageWidth - 15, 15, { align: 'right' });
    doc.setFontSize(9);
    doc.text(`CÓDIGO: ${machine.codigo}`, pageWidth - 15, 22, { align: 'right' });
    doc.text('MANTENIMIENTO INDUSTRIAL v2', pageWidth - 15, 29, { align: 'right' });

    // --- GENERAL SPECS ---
    yPos = 40;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('INFORMACIÓN GENERAL DEL EQUIPO', 15, yPos);
    yPos += 5;

    const specs = [
        ['NOMBRE:', machine.nombre || '--', 'ESTADO:', machine.estado || '--'],
        ['MARCA:', machine.marca || '--', 'MODELO:', machine.modelo || '--'],
        ['SERIAL:', machine.serial || '--', 'ÁREA:', machine.area_produccion || '--'],
        ['UBICACIÓN:', machine.ubicacion || '--', 'RESPONSABLE:', machine.responsable || '--'],
        ['COMPRA:', machine.fecha_compra ? new Date(machine.fecha_compra).toLocaleDateString() : '--', 'TIPO:', machine.tipo || '--']
    ];

    autoTable(doc, {
        startY: yPos,
        margin: { left: 15, right: machineImage ? 80 : 15 },
        body: specs,
        theme: 'plain',
        bodyStyles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 25 },
            1: { cellWidth: 50 },
            2: { fontStyle: 'bold', cellWidth: 25 },
            3: { cellWidth: 40 }
        }
    });

    if (machineImage) {
        try {
            const imgW = 60;
            const imgH = 45;
            doc.addImage(machineImage, 'JPEG', pageWidth - imgW - 15, yPos, imgW, imgH);
            doc.setDrawColor(200);
            doc.rect(pageWidth - imgW - 15, yPos, imgW, imgH);
        } catch (e) {}
    }

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // --- MAINTENANCE HISTORY ---
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('HISTORIAL RECIENTE DE MANTENIMIENTO', 15, yPos);
    yPos += 5;

    const history = (machine.mantenimientos || [])
        .filter((m: any) => m.estado === 'Realizado')
        .slice(0, 10)
        .map((m: any) => [
            new Date(m.fecha_realizada).toLocaleDateString(),
            'PREVENTIVO',
            m.tecnico_responsable || '--',
            m.observaciones || 'Sin observaciones',
            `$${m.costo_mantenimiento?.toLocaleString() || 0}`
        ]);

    const correctivos = (machine.ordenesMantenimiento || [])
        .filter((o: any) => o.estado === 'Cerrada')
        .slice(0, 10)
        .map((o: any) => [
            new Date(o.fecha_fin).toLocaleDateString(),
            'CORRECTIVO',
            o.tecnico || '--',
            o.actividades || 'Sin descripción',
            `$${o.costo?.toLocaleString() || 0}`
        ]);

    const allHistory = [...history, ...correctivos].sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

    autoTable(doc, {
        startY: yPos,
        margin: 15,
        head: [['FECHA', 'TIPO', 'TÉCNICO', 'DESCRIPCIÓN / OBSERVACIONES', 'COSTO']],
        body: allHistory.length > 0 ? allHistory : [['--', '--', '--', 'Sin registros previos', '--']],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], fontSize: 9 },
        bodyStyles: { fontSize: 8 }
    });

    // --- FOOTER ---
    yPos = (doc as any).lastAutoTable.finalY + 20;
    if (yPos > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        yPos = 30;
    }

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Documento generado automáticamente por MT ERP v2 - ${new Date().toLocaleString()}`, 15, yPos);
    
    doc.save(`FICHA_${machine.codigo}.pdf`);
};
