
export interface ExtractedPOItem {
    posicion?: string | null;
    referencia: string | null;
    descripcion: string | null;
    cantidad: number | null;
    material?: string | null;
    precio_unitario?: number | null;
    valor_total?: number | null;
    fecha_entrega?: string | null;
}

export interface ExtractedPO {
    empresa: string;
    numero_orden: string | null;
    cliente: string;
    fecha: string | null;
    items: ExtractedPOItem[];
    observaciones: string | null;
}

/* ==========================================================================
   1. LIMPIEZA Y NORMALIZACIÓN (UTILIDADES)
   ========================================================================== */

/**
 * Convierte formatos '25/02/2026', '25.02.2026' o 'martes, 24 de marzo...' a 'YYYY-MM-DD'.
 */
function normalizeDate(val: string | null): string | null {
    if (!val) return null;
    const str = val.trim().toLowerCase();

    // dd/mm/yyyy o dd.mm.yyyy
    const slashMatch = str.match(/(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/);
    if (slashMatch) {
        return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
    }

    // Meses en español
    const months: { [key: string]: string } = {
        enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
        julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
    };
    
    // Buscar dd de [mes] de yyyy
    const textDateMatch = str.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/);
    if (textDateMatch) {
        const d = textDateMatch[1].padStart(2, '0');
        const m = months[textDateMatch[2]];
        const y = textDateMatch[3];
        if (m) return `${y}-${m}-${d}`;
    }

    // Si es solo un nombre de mes (TNK)
    for (const [name, num] of Object.entries(months)) {
        if (str.includes(name)) return num; // Devolvemos solo el mes si es lo único que hay
    }

    return val;
}

/**
 * Convierte números como '1.000,00' o '1.000.000' a float de JS.
 */
function normalizeNumeric(val: string | null): number {
    if (!val) return 0;
    let str = val.trim().replace(/\$/g, '').replace(/\s/g, '');
    
    // Caso 1.000,00 (punto miles, coma decimal)
    if (str.includes('.') && str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
    } 
    // Caso 1.000.000 (solo puntos)
    else if (str.includes('.')) {
        // Si hay un punto seguido de 2 o menos dígitos al final, asumimos decimal
        const parts = str.split('.');
        if (parts[parts.length - 1].length <= 2) {
            str = str.replace(/\./g, ''); // Muy arriesgado, mejor:
        } else {
            str = str.replace(/\./g, '');
        }
    }
    // Caso 1000,00 (solo coma)
    else if (str.includes(',')) {
        str = str.replace(',', '.');
    }

    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
}

/* ==========================================================================
   2. PLANTILLAS DE EXTRACCIÓN (REGLAS POR EMPRESA)
   ========================================================================== */

/**
 * SIEMENS
 */
const extractSiemens = (text: string): ExtractedPO => {
    const lines = text.split('\n').filter(Boolean);
    const oc = (text.match(/Número de orden\.\s*(\d+)/i) || text.match(/\b(45\d{8,})\b/i) || [])[1] || null;
    const fecha = normalizeDate((text.match(/Fecha:\s*(\d{2}\.\d{2}\.\d{4})/i) || text.match(/(\d{2}\.\d{2}\.\d{4})/) || [])[1] || null);

    const items: ExtractedPOItem[] = [];
    for (let i = 0; i < lines.length; i++) {
        // [Posicion] [Referencia]
        const header = lines[i].match(/^(\d{5})\s+(\d{6,})$/);
        if (header) {
            const posicion = header[1];
            const referencia = header[2];
            
            // Buscar detalle en las siguientes 5 líneas
            for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
                const l = lines[j];
                const p = l.match(/^(.+?)\s+(\d+)\s+Piece\s+([\d\.]+)\s+([\d\.]+)$/i);
                if (p) {
                    items.push({
                        posicion,
                        referencia,
                        descripcion: p[1].trim(),
                        cantidad: normalizeNumeric(p[2]),
                        precio_unitario: normalizeNumeric(p[3]),
                        valor_total: normalizeNumeric(p[4])
                    });
                    break;
                }
            }
        }
    }

    return {
        empresa: 'SIEMENS',
        numero_orden: oc,
        cliente: 'SIEMENS',
        fecha,
        items,
        observaciones: text.includes('REVIEW') ? 'Commodity Code: REVIEW' : null
    };
};

/**
 * SERIES
 */
const extractSeries = (text: string): ExtractedPO => {
    const lines = text.split('\n').filter(Boolean);
    const oc = (text.match(/ORDEN DE COMPRA:\s*(OC\d+)/i) || text.match(/ORDEN DE COMPRA\s+(OC\d+)/i) || text.match(/OC:\s*(OC\d+)/i) || [])[1] || null;
    const fecha = normalizeDate((text.match(/Fecha:\s*([^\n]+)/i) || text.match(/\d{1,2}\/\d{1,2}\/\d{4}/) || [])[1] || null);

    const items: ExtractedPOItem[] = [];
    for (let i = 0; i < lines.length; i++) {
        // Código SERIES (ej: MP4570 o FE8238)
        if (/^[A-Z]{2}\d{3,}/i.test(lines[i])) {
            const referencia = lines[i].trim();
            
            let entrega = null;
            let cantidad = null;
            let unitario = null;
            let total = null;
            let descripcion = null;

            // Buscar datos en el entorno
            for (let j = i - 5; j <= i + 10; j++) {
                if (!lines[j]) continue;
                const l = lines[j];

                // Patrón Cantidades/Precios: [Cant] [Pend] [UM] [$Pre] [$Tot]
                const m = l.match(/([\d\.]+)\s+[\d\.]+\s+UN\s+\$?\s*([\d\.,]+)\s+\$?\s*([\d\.,]+)/i);
                if (m) {
                    cantidad = normalizeNumeric(m[1]);
                    unitario = normalizeNumeric(m[2]);
                    total = normalizeNumeric(m[3]);
                }
                
                // Fecha de entrega
                const f = l.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
                if (f) entrega = normalizeDate(f[1]);

                // Descripción (línea cercana que no es precio ni fecha)
                if (j > i && !descripcion && !m && !f && l.length > 5) {
                    descripcion = l.trim();
                }
            }

            items.push({
                referencia,
                descripcion: descripcion || 'S/D',
                cantidad,
                precio_unitario: unitario,
                valor_total: total,
                fecha_entrega: entrega
            });
        }
    }

    return {
        empresa: 'SERIES',
        numero_orden: oc,
        cliente: 'SERIES SAS',
        fecha,
        items,
        observaciones: text.includes('ENTREGADO') ? 'ESTADO: ENTREGADO' : null
    };
};

/**
 * TNK
 */
const extractTnk = (text: string): ExtractedPO => {
    const lines = text.split('\n').filter(Boolean);
    const oc = (text.match(/001-OCC-\d+/i) || [])[0] || null;
    const fecha = normalizeDate((text.match(/\d{2}\/\d{2}\/\d{4}/) || [])[0] || null);

    const items: ExtractedPOItem[] = [];
    const obsIdx = lines.findIndex(l => /OBSERVACI/i.test(l));
    const observaciones = obsIdx !== -1 ? lines.slice(obsIdx, obsIdx + 5).join(' ').trim() : null;

    for (const l of lines) {
        // [Item] [Desc] [BD] [UM] [Cant] [Pre]
        const m = l.trim().match(/^(\d+)\s+(.+?)\s+(BD\d{3})\s+(UN|UND|PZ|UN\s+)\s+([\d\.]+,?\d*)\s+\$?\s*([\d\.]+,?\d*)\s+[\d\.,]+\s+\$?\s*[\d\.,]+\s+\$?\s*([\d\.]+,?\d*)/i);
        if (m) {
            items.push({
                posicion: m[1],
                referencia: m[1],
                descripcion: m[2].trim(),
                material: m[3],
                cantidad: normalizeNumeric(m[5]),
                precio_unitario: normalizeNumeric(m[6]),
                valor_total: normalizeNumeric(m[7]),
                fecha_entrega: normalizeDate(observaciones) // TNK suele tener la entrega en obs
            });
        }
    }

    return {
        empresa: 'TNK',
        numero_orden: oc,
        cliente: 'TERMINALES AUTOMOTRICES S.A.S.',
        fecha,
        items,
        observaciones
    };
};

/* ==========================================================================
   3. FUNCIÓN PRINCIPAL (FLUJO DETERMINÍSTICO)
   ========================================================================== */

export const parsePOText = (rawText: string): ExtractedPO => {
    // Clasificación
    const t = rawText.toUpperCase();
    
    if (t.includes('SIEMENS')) {
        return extractSiemens(rawText);
    } 
    
    if (t.includes('TNK') || t.includes('TERMINALES AUTOMOTRICES')) {
        return extractTnk(rawText);
    }

    if (t.includes('SERIES SAS') || t.includes('SERIES SEATING') || t.includes('OC: OC')) {
        return extractSeries(rawText);
    }

    // DESCONOCIDO
    return {
        empresa: 'DESCONOCIDO',
        numero_orden: null,
        cliente: 'DESCONOCIDO',
        fecha: null,
        items: [],
        observaciones: `TEXTO_CRUDO: ${rawText.substring(0, 500)}...`
    };
};
