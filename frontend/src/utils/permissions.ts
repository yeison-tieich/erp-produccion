export type PermissionMatrix = Record<string, Record<string, boolean>>;

export const getPermissionMatrix = (permissions: string | null | undefined): PermissionMatrix | null => {
    if (!permissions) return null;

    try {
        const parsed: unknown = JSON.parse(permissions);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as PermissionMatrix;
        }
    } catch (error) {
        console.error('No se pudieron leer los permisos del usuario:', error);
    }

    return null;
};

export const getModulePermission = (
    permissions: string | null | undefined,
    module: string
): boolean | undefined => {
    const matrix = getPermissionMatrix(permissions);
    const viewPermission = matrix?.[module]?.ver;
    return typeof viewPermission === 'boolean' ? viewPermission : undefined;
};

export const canAccessModule = (
    permissions: string | null | undefined,
    module: string,
    roleAllowsAccess: boolean
): boolean => getModulePermission(permissions, module) ?? roleAllowsAccess;
