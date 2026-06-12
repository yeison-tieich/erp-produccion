
import { callAI } from './aiService';

export interface GeneratedRoute {
    nombre_operacion: string;
    centro_trabajo: string;
    tiempo_estimado_min: number;
}

export const generateManufacturingRoute = async (
    productType: string,
    material: string,
    availableProcesses: string[],
    availableMachines: string[]
): Promise<GeneratedRoute[]> => {
    const prompt = `
        Genera una ruta de fabricación lógica para el siguiente producto en una planta metalmecánica.
        
        Producto: ${productType}
        Material: ${material}
        Procesos disponibles: ${availableProcesses.join(', ')}
        Máquinas disponibles: ${availableMachines.join(', ')}
        
        La respuesta debe ser un array de objetos JSON con esta estructura:
        {
            "nombre_operacion": "nombre",
            "centro_trabajo": "área o máquina",
            "tiempo_estimado_min": minutos_estimados
        }
        
        Ordena las operaciones secuencialmente (Corte, Doblez, Soldadura, etc.).
        Responde ÚNICAMENTE con el array JSON.
    `;

    const response = await callAI(prompt, 'Eres un ingeniero de procesos industriales experto en rutas de fabricación.');

    if (Array.isArray(response.json)) {
        return response.json as GeneratedRoute[];
    }

    // Attempt to parse array from text if JSON.parse failed
    try {
        const match = response.text.match(/\[.*\]/s);
        if (match) {
            return JSON.parse(match[0]) as GeneratedRoute[];
        }
    } catch (e) {
        console.error('Failed to parse route array from AI response');
    }

    throw new Error('AI could not generate a valid manufacturing route');
};
