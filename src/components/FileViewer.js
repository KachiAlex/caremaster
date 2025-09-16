import React, { useState } from 'react';
import { Eye, Download, File, Image, FileText, X } from 'lucide-react';

const FileViewer = ({ files = [], onRemove, canRemove = false }) => {
  const [previewFile, setPreviewFile] = useState(null);

  const getFileIcon = (file) => {
    if (file.type?.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    } else if (file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')) {
      return <FileText className="h-4 w-4 text-red-500" />;
    } else {
      return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (file) => {
    if (file.downloadURL) {
      window.open(file.downloadURL, '_blank');
    }
  };

  const handlePreview = (file) => {
    if (file.type?.startsWith('image/') || file.name?.toLowerCase().endsWith('.pdf')) {
      setPreviewFile(file);
    } else {
      handleDownload(file);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  if (!files || files.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        <File className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No files uploaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file, index) => (
        <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-3 flex-1">
            {getFileIcon(file)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(file.size)}
                {file.uploadedAt && (
                  <span> • {new Date(file.uploadedAt).toLocaleDateString()}</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePreview(file)}
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title="View file"
            >
              <Eye className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => handleDownload(file)}
              className="text-gray-400 hover:text-green-500 transition-colors"
              title="Download file"
            >
              <Download className="h-4 w-4" />
            </button>
            
            {canRemove && onRemove && (
              <button
                onClick={() => onRemove(index)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">{previewFile.name}</h3>
              <button
                onClick={closePreview}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-4 max-h-96 overflow-auto">
              {previewFile.type?.startsWith('image/') ? (
                <img
                  src={previewFile.downloadURL}
                  alt={previewFile.name}
                  className="max-w-full h-auto mx-auto"
                />
              ) : previewFile.name?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewFile.downloadURL}
                  className="w-full h-96 border-0"
                  title={previewFile.name}
                />
              ) : (
                <div className="text-center py-8">
                  <File className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Preview not available for this file type</p>
                  <button
                    onClick={() => handleDownload(previewFile)}
                    className="mt-4 btn btn-primary"
                  >
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileViewer;
