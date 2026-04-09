import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, Upload } from 'lucide-react'; // ใช้ icon ที่คุณมีอยู่แล้ว

const CameraScanner = ({ onCapture }: { onCapture: (imgBase64: string) => void }) => {
  const webcamRef = useRef<Webcam>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  // ฟังก์ชันถ่ายภาพ
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
    }
  }, [onCapture]);

  // สลับกล้องหน้า-หลัง (สำหรับมือถือ)
  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onCapture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto p-4">
      <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl bg-black shadow-lg">
        {/* กล้อง Webcam */}
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode }}
          className="w-full h-full object-cover"
        />

        {/* --- UI Overlay (หัวใจสำคัญ) --- */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* กรอบเล็ง (Guide Box) */}
          <div className="w-[85%] h-[70%] border-2 border-yellow-400 border-dashed rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
             {/* มุมกรอบเพื่อความสวยงาม */}
             <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-yellow-400 rounded-tl-md"></div>
             <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-yellow-400 rounded-tr-md"></div>
             <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-yellow-400 rounded-bl-md"></div>
             <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-yellow-400 rounded-br-md"></div>
          </div>
          
          <p className="absolute top-4 text-white text-sm font-medium bg-black/40 px-3 py-1 rounded-full">
            วางหน้าเล่มทะเบียนให้อยู่ในกรอบ
          </p>
        </div>
      </div>

      {/* ปุ่มควบคุม */}
      <div className="flex justify-between w-full mt-6 px-4">
        <button 
          onClick={toggleCamera}
          className="p-3 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
          title="สลับกล้อง"
        >
          <RefreshCw size={24} className="text-gray-700" />
        </button>

        <button 
          onClick={capture}
          className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 shadow-lg transform active:scale-95 transition-all"
        >
          <Camera size={24} />
          ถ่ายรูป
        </button>

        <label className="p-3 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors cursor-pointer">
          <Upload size={24} className="text-gray-700" />
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </label>
      </div>
    </div>
  );
};

export default CameraScanner;