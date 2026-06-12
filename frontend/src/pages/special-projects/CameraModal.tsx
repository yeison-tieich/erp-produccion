import React, { useRef, useState, useEffect } from 'react';
import { X, Camera, RefreshCw, Check } from 'lucide-react';

interface CameraModalProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setCurrentDeviceId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error enumerating devices:', err);
      }
    };

    getDevices();
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      try {
        const constraints = {
          video: currentDeviceId ? { deviceId: { exact: currentDeviceId } } : { facingMode: 'environment' }
        };
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        setError(null);
      } catch (err) {
        console.error('Error starting camera:', err);
        setError('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
      }
    };

    if (currentDeviceId || devices.length === 0) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentDeviceId]);

  const toggleCamera = () => {
    if (devices.length > 1) {
      const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      setCurrentDeviceId(devices[nextIndex].deviceId);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
      }
    }
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      // Convert data URL to File object
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
          onClose();
        });
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col aspect-square md:aspect-auto">
        <div className="p-4 flex justify-between items-center bg-slate-800 text-white">
          <h3 className="font-bold flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-400" />
            Tomar Foto de Referencia
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="text-white p-8 text-center">
              <p className="mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-brand-600 px-4 py-2 rounded-lg font-bold"
              >
                Reintentar
              </button>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured" className="max-w-full max-h-full object-contain" />
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-6 bg-slate-800 flex justify-center items-center gap-6">
          {!capturedImage ? (
            <>
              {devices.length > 1 && (
                <button 
                  onClick={toggleCamera}
                  className="p-4 bg-slate-700 hover:bg-slate-600 text-white rounded-full transition shadow-lg"
                  title="Cambiar Cámara"
                >
                  <RefreshCw className="w-6 h-6" />
                </button>
              )}
              <button 
                onClick={capturePhoto}
                className="p-6 bg-brand-600 hover:bg-brand-700 text-white rounded-full transition shadow-xl shadow-brand-900/40 transform active:scale-95"
                title="Capturar"
              >
                <Camera className="w-8 h-8" />
              </button>
              <div className="w-14" /> {/* Spacer to balance UI if toggle exists */}
            </>
          ) : (
            <>
              <button 
                onClick={retakePhoto}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-bold transition flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Repetir
              </button>
              <button 
                onClick={confirmPhoto}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold transition shadow-lg flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Usar Foto
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraModal;
