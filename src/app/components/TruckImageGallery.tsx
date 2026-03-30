import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface TruckImageGalleryProps {
  images: string[];
  modelName: string;
}

export function TruckImageGallery({ images, modelName }: TruckImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="mt-6 p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="font-medium">ไม่มีรูปรถรุ่นนี้ในระบบ</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-[#001489]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-bold text-[#001489]">รูปรถรุ่น {modelName}</h3>
          <span className="text-sm text-gray-500">({images.length} รูป)</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(image)}
              className="group relative aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#CB333B] transition-all duration-200 shadow-sm hover:shadow-lg"
            >
              <img
                src={image}
                alt={`${modelName} - รูปที่ ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                loading="lazy"
              />
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-2">
                  <svg className="w-6 h-6 text-[#001489]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>

              {/* Image number badge */}
              <div className="absolute top-2 right-2 bg-[#001489] text-white text-xs px-2 py-1 rounded-full font-semibold shadow">
                {index + 1}
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-3 text-center">
          คลิกที่รูปเพื่อดูขนาดใหญ่
        </p>
      </div>

      {/* Image Preview Modal */}
      <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#001489]">
              รูปรถรุ่น {modelName}
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="mt-4">
              <img
                src={selectedImage}
                alt={`${modelName} - ขนาดใหญ่`}
                className="w-full h-auto rounded-lg shadow-xl"
              />
              <div className="mt-4 flex gap-3 justify-center">
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
                >
                  ปิด
                </button>
                <a
                  href={selectedImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-[#001489] hover:bg-[#001a70] text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  เปิดในแท็บใหม่
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
