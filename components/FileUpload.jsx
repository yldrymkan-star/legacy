import React, { useState, useRef } from 'react';
import { ICON_UPLOAD } from './constants.jsx'; // Corrected path to ./constants.jsx

const FileUpload = ({
  onFileChange,
  isLoading,
  clearFile,
}) => {
  const [selectedFileName, setSelectedFileName] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    if (clearFile) {
      setSelectedFileName(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [clearFile]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result?.toString().split(',')[1];
        if (base64String) {
          onFileChange(base64String, file.type, file);
          if (file.type.startsWith('image/')) {
            setPreviewUrl(URL.createObjectURL(file));
          } else if (file.type.startsWith('video/')) {
            setPreviewUrl(null); // No direct video preview URL needed for now
          }
        }
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFileName(null);
      setPreviewUrl(null);
      onFileChange('', '', null); // Clear file
    }
  };

  return (
    React.createElement(
      'div',
      { className: 'flex flex-col items-center' },
      React.createElement(
        'label',
        {
          htmlFor: 'file-upload',
          className: `inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 shadow-md
          ${
            isLoading
              ? 'bg-stone-400 text-stone-700 cursor-not-allowed'
              : 'bg-stone-600 text-white hover:bg-stone-700 cursor-pointer'
          }
        `,
        },
        ICON_UPLOAD,
        React.createElement(
          'span',
          { className: 'ml-2' },
          selectedFileName ? selectedFileName : 'Upload Image/Video'
        )
      ),
      React.createElement('input', {
        id: 'file-upload',
        type: 'file',
        accept: 'image/*,video/*',
        className: 'hidden',
        onChange: handleFileChange,
        disabled: isLoading,
        ref: fileInputRef,
      }),
      previewUrl &&
        React.createElement(
          'div',
          { className: 'mt-4 max-w-xs h-32 overflow-hidden rounded-xl shadow-md border border-stone-300 dark:border-stone-700' },
          selectedFileName?.startsWith('image/') &&
            React.createElement('img', {
              src: previewUrl,
              alt: 'Preview',
              className: 'w-full h-full object-cover',
            })
          // We don't need a video preview here, as the video is processed for audio
        )
    )
  );
};

export default FileUpload;