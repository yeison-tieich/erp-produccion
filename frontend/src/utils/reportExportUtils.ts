import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportReportToExcel = (reportData: any) => {
    const { kpis, operarios_ranking, produccion_diaria, periodo } = reportData;

    // Summary Sheet
    const summaryData = [
        ['Informe Mensual de Producción'],
        ['Periodo:', `${new Date(periodo.start).toLocaleDateString()} - ${new Date(periodo.end).toLocaleDateString()}`],
        [],
        ['INDICADORES CLAVE (KPIs)'],
        ['Producción'],
        ['Total Órdenes', kpis.produccion.total_ordenes],
        ['Total Piezas Fabricadas', kpis.produccion.total_piezas],
        ['Piezas por Día', kpis.produccion.piezas_por_dia],
        ['Productividad (Piezas/Hora)', kpis.produccion.piezas_por_hora],
        [],
        ['Costos'],
        ['Costo Total', kpis.costos.costo_total],
        ['Costo Promedio por Orden', kpis.costos.costo_promedio_orden],
        ['Costo Promedio por Pieza', kpis.costos.costo_promedio_pieza],
        ['Variación vs Mes Anterior (%)', kpis.costos.variacion_costo],
        [],
        ['Eficiencia'],
        ['Eficiencia General (%)', kpis.eficiencia.promedio],
    ];

    // Operators Ranking Sheet
    const rankingHeaders = [['Nombre', 'Eficiencia (%)', 'Piezas Producidas', 'Horas Trabajadas']];
    const rankingData = operarios_ranking.map((op: any) => [
        op.nombre, 
        op.eficiencia.toFixed(2), 
        op.piezas, 
        op.horas_trabajadas
    ]);

    // Daily Production Sheet
    const dailyHeaders = [['Fecha', 'Piezas Producidas']];
    const dailyData = produccion_diaria.map((d: any) => [d.fecha, d.piezas]);

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen KPIs');

    const wsRanking = XLSX.utils.aoa_to_sheet([...rankingHeaders, ...rankingData]);
    XLSX.utils.book_append_sheet(wb, wsRanking, 'Ranking Operarios');

    const wsDaily = XLSX.utils.aoa_to_sheet([...dailyHeaders, ...dailyData]);
    XLSX.utils.book_append_sheet(wb, wsDaily, 'Producción Diaria');

    // Export
    XLSX.writeFile(wb, `Informe_Produccion_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const generateReportPDF = (reportData: any) => {
    const { kpis, operarios_ranking, periodo } = reportData;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 44, 52);
    doc.text('INFORME MENSUAL DE PRODUCCIÓN', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periodo: ${new Date(periodo.start).toLocaleDateString()} al ${new Date(periodo.end).toLocaleDateString()}`, 14, 30);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 35);

    // Section 1: KPIs
    doc.setFontSize(16);
    doc.setTextColor(139, 92, 246); // Purple
    doc.text('1. Indicadores Clave (KPIs)', 14, 50);

    autoTable(doc, {
        startY: 55,
        head: [['Categoría', 'Indicador', 'Valor']],
        body: [
            ['PRODUCCIÓN', 'Total Órdenes Ejecutadas', kpis.produccion.total_ordenes],
            ['PRODUCCIÓN', 'Total Piezas Fabricadas', kpis.produccion.total_piezas.toLocaleString()],
            ['PRODUCCIÓN', 'Piezas por Día', kpis.produccion.piezas_por_dia],
            ['PRODUCCIÓN', 'Productividad (Piezas/Hora)', `${kpis.produccion.piezas_por_hora} pcs/h`],
            ['COSTOS', 'Costo Total de Producción', `$${kpis.costos.costo_total.toLocaleString()}`],
            ['COSTOS', 'Costo Promedio por Pieza', `$${kpis.costos.costo_promedio_pieza.toFixed(2)}`],
            ['COSTOS', 'Variación vs Mes Anterior', `${kpis.costos.variacion_costo}%`],
            ['EFICIENCIA', 'Eficiencia General', `${kpis.eficiencia.promedio.toFixed(1)}%`],
            ['TIEMPOS', 'Desviación de Tiempos', `${kpis.tiempos.desviacion_tiempos}%`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] },
    });

    // Section 2: Ranking
    doc.setFontSize(16);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text('2. Ranking de Eficiencia por Operario', 14, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Pos', 'Nombre Operario', 'Eficiencia', 'Piezas', 'Hrs Trab.']],
        body: operarios_ranking.map((op: any, i: number) => [
            i + 1,
            op.nombre,
            `${op.eficiencia.toFixed(1)}%`,
            op.piezas,
            op.horas_trabajadas
        ]),
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} - Control MT ERP System`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`Informe_Mensual_${new Date().getMonth() + 1}_${new Date().getFullYear()}.pdf`);
};
