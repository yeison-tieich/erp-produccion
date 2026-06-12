import axios from 'axios';
import dotenv from 'dotenv';
import prisma from '../prisma';

dotenv.config();

export interface AIResponse {
    text: string;
    json?: any;
}

export const callAI = async (prompt: string, systemPrompt?: string): Promise<AIResponse> => {
    const config = await prisma.configuracion.findFirst();
    const OPENROUTER_API_KEY = config?.openrouter_api_key || process.env.OPENROUTER_API_KEY;
    const OPENROUTER_MODEL = config?.openrouter_model || process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free';

    if (!OPENROUTER_API_KEY) {
        throw new Error('La API Key de OpenRouter no está configurada. Por favor, configúrala en la interfaz.');
    }

    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: OPENROUTER_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt || 'Eres un asistente experto en gestión de producción industrial.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' }
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'http://localhost:3000', // Optional, for OpenRouter rankings
                    'X-Title': 'MT Production ERP', // Optional, for OpenRouter rankings
                    'Content-Type': 'application/json'
                }
            }
        );

        const content = response.data.choices[0].message.content;
        let jsonContent = null;
        try {
            jsonContent = JSON.parse(content);
        } catch (e) {
            // If it's not JSON, return as text
        }

        return {
            text: content,
            json: jsonContent
        };
    } catch (error: any) {
        console.error('Error calling OpenRouter:', error.response?.data || error.message);
        throw new Error('Failed to communicate with AI service');
    }
};
