
import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, CameraOff, Loader2 } from 'lucide-react';
import jsQR from 'jsqr';

interface QrScannerModalProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QrScannerModal: React.FC<QrScannerModalProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastScanTime = useRef<number>(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationId: number;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          // Tunggu metadata video dimuat untuk menghindari dimensi 0
          videoRef.current.onloadedmetadata = () => {
             videoRef.current?.play();
             setLoading(false);
             tick();
          };
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('Gagal mengakses kamera. Pastikan izin kamera diberikan.');
        setLoading(false);
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const now = Date.now();
        // PERFORMANCE FIX: Hanya scan setiap 500ms agar HP tidak panas/lag
        if (now - lastScanTime.current > 500) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              canvas.height = video.videoHeight;
              canvas.width = video.videoWidth;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              
              // Cek QR Code
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });

              if (code && code.data) {
                onScan(code.data);
                return; // Stop loop jika ketemu
              }
              lastScanTime.current = now;
            }
          }
        }
      }
      animationId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(animationId);
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2 text-white">
          <Camera size={20} />
          <span className="font-bold text-sm">Pindai QR Code Item</span>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
          <X size={24} />
        </button>
      </div>

      {/* Viewfinder Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
            <Loader2 className="animate-spin" size={40} />
            <p className="text-sm font-medium">Menyiapkan Kamera...</p>
          </div>
        )}

        {error ? (
          <div className="px-10 text-center text-white space-y-4">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto">
              <CameraOff size={32} />
            </div>
            <p className="text-sm">{error}</p>
            <button onClick={onClose} className="px-6 py-2 bg-white text-black rounded-full font-bold text-xs uppercase">Tutup</button>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Dark Overlays */}
            <div className="absolute inset-0 flex flex-col">
              <div className="flex-1 bg-black/40"></div>
              <div className="flex h-64">
                <div className="flex-1 bg-black/40"></div>
                <div className="w-64 relative">
                  {/* Corner Borders */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                  {/* Laser Line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_rgba(8,145,178,0.8)] animate-scan opacity-70"></div>
                </div>
                <div className="flex-1 bg-black/40"></div>
              </div>
              <div className="flex-1 bg-black/40 flex items-start justify-center pt-8">
                <p className="text-white/60 text-xs font-medium tracking-wide">Posisikan kode di dalam kotak</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QrScannerModal;
