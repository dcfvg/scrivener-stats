import React, { useCallback, useState } from 'react';
import { DocumentArrowUpIcon } from '@heroicons/react/24/solid';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);

  const readAllEntries = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => {
      const entries: FileSystemEntry[] = [];
      const readBatch = () => {
        reader.readEntries((batch) => {
          if (!batch.length) {
            resolve(entries);
            return;
          }
          entries.push(...batch);
          readBatch();
        }, reject);
      };
      readBatch();
    });

  const traverseEntry = async (entry: FileSystemEntry): Promise<File[]> => {
    if (entry.isFile) {
      return new Promise((resolve) => {
        (entry as FileSystemFileEntry).file((file) => resolve([file]));
      });
    }

    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const entries = await readAllEntries(reader);
      const files = await Promise.all(entries.map((child) => traverseEntry(child)));
      return files.flat();
    }

    return [];
  };

  const collectDroppedFiles = async (dataTransfer: DataTransfer): Promise<File[]> => {
    const directFiles = Array.from(dataTransfer.files || []);
    if (directFiles.length) {
      return directFiles;
    }

    const items = Array.from(dataTransfer.items || []);
    const entries = items
      .map((item) => (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry?.())
      .filter((entry): entry is FileSystemEntry => Boolean(entry));

    if (!entries.length) {
      return [];
    }

    const nestedFiles = await Promise.all(entries.map((entry) => traverseEntry(entry)));
    return nestedFiles.flat();
  };

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = await collectDroppedFiles(e.dataTransfer);
    if (files.length) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      onFilesSelected(files);
    }
    e.target.value = '';
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      onFilesSelected(files);
    }
    e.target.value = '';
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
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleChange}
          accept=".txt,.csv,.tsv,text/plain,text/csv,text/tab-separated-values"
        />
        <input
          type="file"
          id="project-upload"
          className="hidden"
          onChange={handleProjectChange}
          multiple
          // @ts-expect-error - webkitdirectory is non-standard but supported by Chromium/Safari.
          webkitdirectory="true"
        />
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer space-y-4">
          <img src={`${import.meta.env.BASE_URL}icons/app-icon.svg`} alt="" className="h-40 w-40" />
          <DocumentArrowUpIcon className="h-10 w-10 text-gray-400" />
          <p className="text-xl font-semibold text-center">
            <span className="text-emerald-400">Select</span> or drop a Scrivener Writing History (.csv)
          </p>
          <p className="text-emerald-400/70 text-xs mt-2">🔒 Your data stays on your computer — processed locally. Share via <code className="text-emerald-400/90">?path=</code> to pre-load a file.</p>
        </label>
      </div>
      <div className="mt-8 max-w-2xl mx-auto w-full">
        <h3 className="font-semibold text-gray-200 mb-3 text-center">How to export your data from Scrivener</h3>
        <div className="bg-gray-800 p-5 rounded-lg border border-emerald-700/50 text-sm">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Open your project in Scrivener</li>
            <li>Go to <code className="bg-gray-700 px-1 rounded text-xs">Project</code> → <code className="bg-gray-700 px-1 rounded text-xs">Writing History…</code></li>
            <li>Click <code className="bg-gray-700 px-1 rounded text-xs">Export</code> and save the file</li>
            <li>Drop or select the saved file above</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
