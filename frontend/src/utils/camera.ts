import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Convierte una URL (webPath o blob) a un objeto File estándar.
 */
async function urlToFile(url: string, filename: string): Promise<File> {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

/**
 * Abre la cámara del dispositivo móvil para tomar una foto directamente.
 */
export async function capturePhotoFromCamera(filenamePrefix = 'foto'): Promise<File | null> {
    try {
        const photo = await Camera.getPhoto({
            quality: 85,
            allowEditing: false,
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            saveToGallery: false,
            promptLabelHeader: 'Cámara',
            promptLabelPhoto: 'De Galería',
            promptLabelPicture: 'Tomar Foto',
            promptLabelCancel: 'Cancelar'
        });

        if (!photo.webPath) return null;
        const filename = `${filenamePrefix}_${Date.now()}.${photo.format || 'jpg'}`;
        return await urlToFile(photo.webPath, filename);
    } catch (error: any) {
        if (error?.message?.includes('User cancelled') || error?.message?.includes('cancelled')) {
            return null;
        }
        console.warn('Camera capture cancelled or failed:', error);
        return null;
    }
}

/**
 * Abre la galería o selector de archivos del dispositivo.
 */
export async function pickPhotoFromGallery(filenamePrefix = 'imagen'): Promise<File | null> {
    try {
        const photo = await Camera.getPhoto({
            quality: 85,
            allowEditing: false,
            resultType: CameraResultType.Uri,
            source: CameraSource.Photos,
            promptLabelHeader: 'Galería',
            promptLabelPhoto: 'De Galería',
            promptLabelPicture: 'Tomar Foto',
            promptLabelCancel: 'Cancelar'
        });

        if (!photo.webPath) return null;
        const filename = `${filenamePrefix}_${Date.now()}.${photo.format || 'jpg'}`;
        return await urlToFile(photo.webPath, filename);
    } catch (error: any) {
        if (error?.message?.includes('User cancelled') || error?.message?.includes('cancelled')) {
            return null;
        }
        console.warn('Gallery pick cancelled or failed:', error);
        return null;
    }
}
