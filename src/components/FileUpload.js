import React, { useState, useRef } from 'react';
import { Upload, X, File, Image, FileText } from 'lucide-react';
import { toast } from 'react-toastify';

const FileUpload = ({ 
  label, 
  accept = "image/*,.pdf,.doc,.docx", 
  maxSize = 5 * 1024 * 1024, // 5MB
  onFileSelect,
  onFileRemove,
  files = [],
  multiple = false,
  className = ""
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = (fileList) => {
    const validFiles = [];
    const errors = [];

    fileList.forEach(file => {
      // Check file size
      if (file.size > maxSize) {
        errors.push(`${file.name} is too large. Maximum size is ${(maxSize / (1024 * 1024)).toFixed(1)}MB`);
        return;
      }

      // Check file type
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const allowedTypes = accept.split(',').map(type => type.trim());
      const isAllowed = allowedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExtension === type.substring(1);
        } else if (type.includes('/*')) {
          const category = type.split('/')[0];
          return file.type.startsWith(category);
        }
        return file.type === type;
      });

      if (!isAllowed) {
        errors.push(`${file.name} is not an allowed file type`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
    }

    if (validFiles.length > 0) {
      if (multiple) {
        onFileSelect([...files, ...validFiles]);
      } else {
        onFileSelect(validFiles[0]);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index) => {
    if (multiple) {
      const newFiles = files.filter((_, i) => i !== index);
      onFileRemove(newFiles);
    } else {
      onFileRemove(null);
    }
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    } else {
      return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">
          {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {accept.includes('image/*') ? 'Images, PDFs, Documents' : 'PDFs, Documents'} up to {(maxSize / (1024 * 1024)).toFixed(1)}MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files && files.length > 0 && (
        <div className="space-y-2">
          {(Array.isArray(files) ? files : [files]).map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                {getFileIcon(file)}
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
