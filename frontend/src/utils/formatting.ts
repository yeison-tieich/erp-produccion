import { useConfigStore } from '../store/config.store';

/**
 * Formats a number based on the configured decimal places for a specific context.
 */
export const formatNumber = (value: number | string | null | undefined, context: 'produccion' | 'costos' | 'medidas' | 'global' = 'global') => {
  if (value === null || value === undefined) return '0';
  
  const settings = useConfigStore.getState().globalSettings;
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0';

  let decimals = 2;
  if (settings) {
    switch (context) {
      case 'produccion': decimals = settings.decimales_produccion; break;
      case 'costos': decimals = settings.decimales_costos; break;
      case 'medidas': decimals = settings.decimales_medidas; break;
      default: decimals = 2;
    }
  }

  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numValue);
};

/**
 * Formats a value with its corresponding unit based on global settings.
 */
export const formatUnit = (value: number | string, type: 'longitud' | 'peso' | 'volumen') => {
  const settings = useConfigStore.getState().globalSettings;
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (!settings) return `${numValue} ${type === 'longitud' ? 'mm' : type === 'peso' ? 'kg' : 'L'}`;

  const unit = type === 'longitud' ? settings.unidad_longitud : 
               type === 'peso' ? settings.unidad_peso : 
               settings.unidad_volumen;

  return `${formatNumber(numValue, 'medidas')} ${unit}`;
};

/**
 * Formats currency based on cost settings.
 */
export const formatCurrency = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return '$0';
  
  const settings = useConfigStore.getState().globalSettings;
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '$0';

  const decimals = settings?.decimales_costos ?? 2;

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numValue);
};
