import React, { useRef, useState } from 'react';
import type { components } from '../../api-types/productService';

type ProductImageDto = components['schemas']['ProductImageDto'];

interface ImageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  images: ProductImageDto[];
  loading: boolean;
  uploading: boolean;
  onUpload: (files: File[]) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
  deletingImageId: string | null;
}

const ImageManagerModal: React.FC<ImageManagerModalProps> = ({
  isOpen,
  onClose,
  productName,
  images,
  loading,
  uploading,
  onUpload,
  onDelete,
  deletingImageId
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (fileArray.length > 0) {
      onUpload(fileArray);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Quản lý hình ảnh - {productName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Upload Area */}
          <button
            type="button"
            className={`w-full border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors cursor-pointer ${
              dragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Click to select images or drag and drop"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
              disabled={uploading}
            />
            
            {uploading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Đang tải lên hình ảnh...</p>
              </div>
            ) : (
              <>
                <div className="text-6xl text-gray-400 mb-4">📷</div>
                <p className="text-lg text-gray-600 mb-2">
                  Kéo thả hình ảnh vào đây hoặc click để chọn
                </p>
                <p className="text-sm text-gray-500">
                  Hỗ trợ định dạng: JPG, PNG, GIF
                </p>
              </>
            )}
          </button>

          {/* Images Grid */}
          {(() => {
            if (loading) {
              return (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Đang tải hình ảnh...</p>
                </div>
              );
            }

            if (images.length === 0) {
              return (
                <div className="text-center py-12">
                  <div className="text-6xl text-gray-300 mb-4">🖼️</div>
                  <p className="text-gray-500">Chưa có hình ảnh nào</p>
                  <p className="text-sm text-gray-400">Tải lên hình ảnh đầu tiên cho sản phẩm</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div key={image.id || index} className="relative group">
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={image.url}
                        alt={image.altText || `Product image ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    
                    {/* Image Info */}
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 truncate">
                        {image.altText || `Hình ảnh ${index + 1}`}
                      </p>
                      {image.isPrimary && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Ảnh chính
                        </span>
                      )}
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => image.id && onDelete(image.id)}
                      disabled={deletingImageId === image.id}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                    >
                      {deletingImageId === image.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                      ) : (
                        '×'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageManagerModal;