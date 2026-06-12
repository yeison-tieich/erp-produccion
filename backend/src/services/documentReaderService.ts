
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PdfReader } = require('pdfreader');
import fs from 'fs';
import { parsePOText, ExtractedPO } from './poParserService';

/**
 * Extracts text from a PDF file using PdfReader, preserving the line structure based on Y coordinates.
 */
const extractTextWithCoordinates = (filePath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const rows: { [key: number]: any[] } = {};
        
        new PdfReader().parseFileItems(filePath, (err: any, item: any) => {
            if (err) {
                return reject(err);
            } else if (!item) {
                // End of file: process rows
                const rowKeys = Object.keys(rows)
                    .map(Number)
                    .sort((a, b) => a - b);
                
                let fullText = '';
                for (const y of rowKeys) {
                    const sortedRow = rows[y].sort((a, b) => a.x - b.x);
                    
                    // Reconstruct line with appropriate spacing based on X coordinate
                    let line = '';
                    let lastX = 0;
                    for (const cell of sortedRow) {
                        // If there is a significant gap between words, add extra space
                        const gap = cell.x - lastX;
                        if (gap > 0.5) line += ' ';
                        line += cell.text;
                        lastX = cell.x + (cell.w || 0.5); // Estimate width if not available
                    }
                    fullText += line + '\n';
                }
                resolve(fullText);
            } else if (item.text) {
                // Approximate Y to group items in the same line
                const y = Math.round(item.y * 10) / 10; 
                if (!rows[y]) rows[y] = [];
                rows[y].push(item);
            }
        });
    });
};

export const readPOFromPDF = async (filePath: string): Promise<ExtractedPO> => {
    console.log(`[DETERMINISTIC] Iniciando extracción de: ${filePath}`);
    
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Archivo no encontrado: ${filePath}`);
        }
        
        const text = await extractTextWithCoordinates(filePath);
        
        // Log para que el usuario pueda ver en la consola lo que se detecta
        console.log('--- RECONSTRUCCIÓN DE LÍNEAS (Layout-Aware) ---');
        console.log(text); 
        console.log('-----------------------------------------------');

        if (!text || text.trim().length === 0) {
            throw new Error('No se pudo extraer texto del PDF.');
        }

        const poData = parsePOText(text);
        
        if (poData.empresa === 'DESCONOCIDO') {
            console.warn('[DETERMINISTIC] No se detectaron ítems. Cliente desconocido.');
        } else {
            console.log(`[DETERMINISTIC] Éxito: ${poData.items.length} ítems extraídos para ${poData.empresa}.`);
        }

        return poData;

    } catch (error: any) {
        console.error('Error en extracción mecánica:', error.message);
        throw new Error(`Error en el proceso determinístico: ${error.message}`);
    }
};
