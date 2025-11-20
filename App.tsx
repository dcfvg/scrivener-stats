
import React, { useState, useCallback, useEffect } from 'react';
import { ProcessedStats } from './types';
import { parseAndProcessScrivenerStats } from './services/analysis';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

// Constants
const LOADING_MESSAGE = 'Analyzing your data locally...';
const ERROR_TITLE = 'Error!';
const NO_DATA_ERROR = 'No valid data found in the file. Please check the file format.';

const App: React.FC = () => {
  const [stats, setStats] = useState<ProcessedStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [autoLoaded, setAutoLoaded] = useState<boolean>(false);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setStats(null);
    setFileName(file.name);

    try {
      const fileContent = await file.text();
      const processedData = parseAndProcessScrivenerStats(fileContent);
      if (processedData.dailyStats.length === 0) {
        throw new Error(NO_DATA_ERROR);
      }
      setStats(processedData);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to process file: ${errorMessage}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReset = () => {
    setStats(null);
    setError(null);
    setIsLoading(false);
    setFileName('');
  };

  // Auto-load from query param ?path=... (timeline API) or ?csv=URL
  useEffect(() => {
    if (autoLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const csvUrlParam = params.get('csv');
    const pathParam = params.get('path');
    
    // If no parameters, don't try to auto-load
    if (!csvUrlParam && !pathParam) {
      setAutoLoaded(true);
      return;
    }
    
    let targetUrl: string | null = null;
    if (csvUrlParam) {
      targetUrl = csvUrlParam;
    } else if (pathParam) {
      const lower = pathParam.toLowerCase();
      const looksLikeUrl = lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('/');
      const looksLikeCsv = lower.endsWith('.csv');
      if (looksLikeUrl || looksLikeCsv) {
        // Treat as direct CSV url
        targetUrl = pathParam;
      } else {
        // Treat as scrivener path for the API
        targetUrl = `/scrivener-stats/api/writing-history.csv?path=${encodeURIComponent(pathParam)}`;
      }
    }
    if (!targetUrl) {
      setAutoLoaded(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setStats(null);
    setFileName(pathParam || csvUrlParam || 'writing-history.csv');

    fetch(targetUrl)
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`Failed to fetch data (${resp.status})`);
        }
        return resp.text();
      })
      .then((fileContent) => {
        const processedData = parseAndProcessScrivenerStats(fileContent);
        if (processedData.dailyStats.length === 0) {
          throw new Error(NO_DATA_ERROR);
        }
        setStats(processedData);
      })
      .catch((e) => {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(`Failed to load data: ${errorMessage}`);
        console.error(e);
      })
      .finally(() => {
        setIsLoading(false);
        setAutoLoaded(true);
      });
  }, [autoLoaded]);

  const Header = () => (
    <header className="w-full p-4 flex justify-between items-center bg-gray-900/80 backdrop-blur-sm border-b border-gray-700">
      <h1 className="text-xl md:text-2xl font-bold text-emerald-400">Scrivener Stat Visualizer</h1>
      {stats && (
        <button
          onClick={handleReset}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-300"
        >
          <ArrowPathIcon className="h-5 w-5" />
          <span>New Report</span>
        </button>
      )}
    </header>
  );

  const Footer = () => (
    <footer className="text-center p-4 text-xs text-gray-500 mt-auto">
      <p>Export your writing history from Scrivener via 'Project' &gt; 'Writing History...' &gt; 'Export'.</p>
      <p className="mt-2 text-emerald-400/70">🔒 All data is processed locally in your browser. Nothing is uploaded or shared.</p>
    </footer>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center text-gray-200 font-sans">
      <Header />
      <main className="w-full max-w-7xl mx-auto p-4 md:p-8 flex-grow">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500"></div>
             <p className="mt-4 text-lg">{LOADING_MESSAGE}</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative flex flex-col items-center" role="alert">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
              <strong className="font-bold">{ERROR_TITLE}</strong>
            </div>
            <span className="block sm:inline mt-2">{error}</span>
            <button
              onClick={handleReset}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : stats ? (
          <Dashboard stats={stats} fileName={fileName} />
        ) : (
          <FileUpload onFileUpload={handleFileUpload} />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default App;
