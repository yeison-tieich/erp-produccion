
export const getAreaFromDescription = (description: string): string => {
    const desc = description.toUpperCase();
    
    if (desc.includes('TORNO')) {
        return 'TORNOS';
    }
    if (desc.includes('CENTRO DE MECANIZADO')) {
        return 'MECANIZADO';
    }
    if (desc.includes('TROQUELADORA')) {
        return 'TROQUELERIA';
    }
    if (desc.includes('SOLDADURA')) {
        return 'SOLDADURA';
    }
    
    return 'SIN CATEGORIA';
};
