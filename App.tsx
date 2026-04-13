import React, { useEffect, useState, useCallback } from 'react';
import { ProcessedStats } from './types';
import { parseAndProcessScrivenerStats } from './services/analysis';
import { processScrivenerFiles } from './services/fileProcessing';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const LOADING_MESSAGE = 'Analyzing your data locally...';
const ERROR_TITLE = 'Error!';
const NO_DATA_ERROR = 'No valid data found. Provide a Scrivener export or project folder.';
const SERVER_CONFIG_URL = `${import.meta.env.BASE_URL}server-config.json`;

type RuntimeServerConfig = {
  autoLoadPath?: string;
  autoLoadLabel?: string;
};

function deriveSourceName(targetUrl: string, preferredLabel?: string): string {
  if (preferredLabel && preferredLabel.trim()) {
    return preferredLabel.trim();
  }

  try {
    const parsedUrl = new URL(targetUrl, window.location.href);
    const parts = parsedUrl.pathname.split('/').filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || 'writing-history.csv');
  } catch (_) {
    return 'writing-history.csv';
  }
}

async function loadRuntimeServerConfig(): Promise<RuntimeServerConfig | null> {
  try {
    const response = await fetch(SERVER_CONFIG_URL, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

const App: React.FC = () => {
  const [stats, setStats] = useState<ProcessedStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [autoLoadSource, setAutoLoadSource] = useState<'none' | 'query' | 'server'>('none');

  const loadStatsFromUrl = useCallback(async (targetUrl: string, preferredLabel?: string, autoLoadSource: 'none' | 'query' | 'server' = 'none') => {
    if (!targetUrl) return;

    setIsLoading(true);
    setError(null);
    setStats(null);
    setFileName('');

    try {
      const response = await fetch(targetUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const fileContent = await response.text();
      const processedData = parseAndProcessScrivenerStats(fileContent);
      if (processedData.dailyStats.length === 0) {
        throw new Error(NO_DATA_ERROR);
      }
      setStats(processedData);
      setFileName(deriveSourceName(targetUrl, preferredLabel));
      setAutoLoadSource(autoLoadSource);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to load remote stats: ${errorMessage}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const paramPath = params.get('path');
        const paramLabel = params.get('label') || undefined;
        if (paramPath) {
          await loadStatsFromUrl(paramPath, paramLabel, 'query');
          return;
        }

        const config = await loadRuntimeServerConfig();
        if (config?.autoLoadPath) {
          await loadStatsFromUrl(config.autoLoadPath, config.autoLoadLabel, 'server');
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadStatsFromUrl]);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (!files.length) return;

    setIsLoading(true);
    setError(null);
    setStats(null);
    setFileName('');

    try {
      const processedData = await processScrivenerFiles(files);
      if (processedData.stats.dailyStats.length === 0) {
        throw new Error(NO_DATA_ERROR);
      }
      setStats(processedData.stats);
      setFileName(processedData.sourceName);
      setAutoLoadSource('none');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to process selection: ${errorMessage}`);
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
    setAutoLoadSource('none');
  };

  const Header = () => (
    <header className="w-full p-4 flex justify-between items-center bg-gray-900/80 backdrop-blur-sm border-b border-gray-700">
      <h1 className="text-xl md:text-2xl font-bold text-emerald-400">Scrivener Stats</h1>
      {stats && autoLoadSource !== 'server' && (
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
      <p>Drop a .scriv project folder, open a writing-history export, or use the <code>?path=</code> URL parameter.</p>
      <p className="mt-2 text-emerald-400/70">🔒 All data is processed locally in your browser. Nothing is uploaded or shared.</p>
    </footer>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center text-gray-200 font-sans">
      {autoLoadSource !== 'server' && <Header />}
      <main className="w-full max-w-7xl mx-auto p-4 md:p-8 flex-grow">
        {isLoading || isBootstrapping ? (
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
          <Dashboard stats={stats} fileName={fileName} showSourceName={autoLoadSource !== 'server'} />
        ) : (
          <FileUpload onFilesSelected={handleFilesSelected} />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default App;
