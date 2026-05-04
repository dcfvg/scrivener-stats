import React, { useCallback, useState } from 'react';
import { DocumentArrowUpIcon } from '@heroicons/react/24/solid';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  onUrlSelected: (url: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, onUrlSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');

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
            <span className="text-emerald-400">Select</span> or drop an export file
          </p>
          <p className="text-gray-400 text-sm">Scrivener Writing History or Project Statistics export (.txt / .csv)</p>
          <p className="text-emerald-400/70 text-xs mt-2">🔒 Your data stays on your computer - processed locally in your browser</p>
        </label>
      </div>
      <form
        className="mt-6 flex gap-2 w-full max-w-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = urlInput.trim();
          if (trimmed) onUrlSelected(trimmed);
        }}
      >
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://example.com/writing-history.csv"
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={!urlInput.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Load
        </button>
      </form>
      <div className="mt-8 text-gray-400 max-w-2xl mx-auto w-full">
        <h3 className="font-semibold text-gray-200 mb-3 text-center">How to get your data:</h3>
        <p className="text-sm text-center mb-4">Export one of the supported formats from Scrivener, then drop or select the file.</p>
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
                <p className="text-xs mb-3 text-gray-500">(Daily progress derived from totals)</p>
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
