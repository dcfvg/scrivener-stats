import React, { useCallback, useState } from 'react';
import { DocumentArrowUpIcon } from '@heroicons/react/24/solid';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  }, [onFileUpload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 md:p-8">
      <div 
        className={`w-full max-w-2xl p-10 border-4 border-dashed rounded-xl transition-colors duration-300 ${isDragging ? 'border-emerald-400 bg-gray-700' : 'border-gray-600 hover:border-emerald-500 hover:bg-gray-800'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input type="file" id="file-upload" className="hidden" onChange={handleChange} accept=".txt,.csv,text/plain,text/csv" />
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer space-y-4">
          <DocumentArrowUpIcon className="h-16 w-16 text-gray-400" />
          <p className="text-xl font-semibold text-center">
            <span className="text-emerald-400">Select your file</span> or drag and drop
          </p>
          <p className="text-gray-400 text-sm">Upload your Scrivener Writing History (.txt or .csv)</p>
          <p className="text-emerald-400/70 text-xs mt-2">🔒 Your data stays on your computer - processed locally in your browser</p>
        </label>
      </div>
      <div className="mt-8 text-gray-400 max-w-2xl mx-auto w-full">
        <h3 className="font-semibold text-gray-200 mb-3 text-center">How to get your data:</h3>
        <p className="text-sm text-center mb-4">This tool supports two Scrivener export formats.</p>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 className="font-bold text-emerald-400 mb-2">Option 1: Daily Progress</h4>
                <p className="text-xs mb-3 text-gray-500">(Recommended for detailed stats)</p>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Go to <code className="bg-gray-700 p-1 rounded-sm text-xs">Project</code> &gt; <code className="bg-gray-700 p-1 rounded-sm text-xs">Writing History...</code></li>
                    <li>Click the <code className="bg-gray-700 p-1 rounded-sm text-xs">Export</code> button.</li>
                </ol>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 className="font-bold text-emerald-400 mb-2">Option 2: Total Word Count</h4>
                <p className="text-xs mb-3 text-gray-500">(Calculates daily progress from totals)</p>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Go to <code className="bg-gray-700 p-1 rounded-sm text-xs">Project</code> &gt; <code className="bg-gray-700 p-1 rounded-sm text-xs">Project Statistics...</code></li>
                    <li>Select the <code className="bg-gray-700 p-1 rounded-sm text-xs">Word counts per day</code> tab.</li>
                    <li>Click <code className="bg-gray-700 p-1 rounded-sm text-xs">Export...</code> and save.</li>
                </ol>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;