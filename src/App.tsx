import React, { useState, useEffect, useRef } from 'react';
import { Upload, File, Lock, Terminal, ShieldAlert, Download } from 'lucide-react';

export default function App() {
  const [files, setFiles] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const fetchFiles = async () => {
    try {
      addLog('Fetching file list from /api/files...');
      const response = await fetch('/api/files');
      if (!response.ok) {
        const text = await response.text();
        let errorMessage = 'Failed to fetch files';
        try {
          const data = JSON.parse(text);
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = `Server unavailable (${response.status})`;
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      setFiles(data);
      addLog(`Successfully fetched ${data.length} files.`);
    } catch (error: any) {
      addLog(`ERROR: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    addLog(`Initiating upload for file: ${file.name}`);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = 'Upload failed';
        try {
          const errData = JSON.parse(text);
          errorMessage = errData.error || errorMessage;
        } catch {
          errorMessage = `Server unavailable (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      addLog(`Upload successful: ${file.name}`);
      fetchFiles();
    } catch (error: any) {
      addLog(`UPLOAD ERROR: ${error.message}`);
    } finally {
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEncrypt = async (filename: string) => {
    addLog(`Initiating encryption for target: ${filename}`);
    try {
      const response = await fetch(`/api/encrypt/${encodeURIComponent(filename)}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = 'Encryption failed';
        try {
          const errData = JSON.parse(text);
          errorMessage = errData.error || errorMessage;
        } catch {
          errorMessage = `Server unavailable (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      addLog(`Encryption successful: ${filename} -> ${filename}.txt`);
      fetchFiles();
    } catch (error: any) {
      addLog(`ENCRYPTION ERROR: ${error.message}`);
    }
  };

  const handleDownload = (filename: string) => {
    addLog(`[EXFILTRATE] Downloading ${filename}...`);
    window.open(`/api/download/${encodeURIComponent(filename)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-green-500 font-mono flex flex-col md:flex-row p-4 gap-4">
      {/* Sidebar - 1/3 width */}
      <div className="w-full md:w-1/3 border border-green-800 rounded-lg flex flex-col bg-gray-900/50 overflow-hidden">
        <div className="p-4 border-b border-green-800 flex justify-between items-center bg-gray-900">
          <div className="flex items-center gap-2 font-bold text-lg">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <span>TARGET_DATA</span>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <button 
            onClick={handleUploadClick}
            className="p-2 hover:bg-green-900/30 rounded transition-colors flex items-center gap-2 text-sm border border-green-800"
            title="Upload File"
          >
            <Upload className="w-4 h-4" />
            <span>UPLOAD</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {files.length === 0 ? (
            <div className="text-green-800 text-center mt-10 italic">No files found in target directory.</div>
          ) : (
            <ul className="space-y-2">
              {files.map((filename) => {
                const isEncrypted = filename.endsWith('.txt');
                
                return (
                  <li 
                    key={filename} 
                    className="flex items-center justify-between p-3 border border-green-900/50 rounded bg-gray-950/50 hover:border-green-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {isEncrypted ? (
                        <Lock className="w-4 h-4 text-red-500 shrink-0" />
                      ) : (
                        <File className="w-4 h-4 text-green-400 shrink-0" />
                      )}
                      
                      <span className={`truncate ${isEncrypted ? 'line-through text-green-800' : 'text-green-400'}`}>
                        {filename}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDownload(filename)}
                        className="p-1.5 text-green-500 hover:bg-green-900/30 hover:text-green-400 rounded transition-colors"
                        title="Download File"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {!isEncrypted && (
                        <button
                          onClick={() => handleEncrypt(filename)}
                          className="px-3 py-1 bg-red-950/30 text-red-500 border border-red-900 rounded text-xs font-bold hover:bg-red-900/50 hover:text-red-400 transition-colors"
                        >
                          LOCK
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Terminal Log - 2/3 width */}
      <div className="w-full md:w-2/3 border border-green-800 rounded-lg flex flex-col bg-black overflow-hidden relative">
        <div className="p-2 border-b border-green-800 flex items-center gap-2 bg-gray-900 text-xs">
          <Terminal className="w-4 h-4" />
          <span>root@red-team-os:~# tail -f /var/log/syslog</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1 text-sm">
          {logs.map((log, index) => (
            <div key={index} className={`${log.includes('ERROR') ? 'text-red-500' : 'text-green-500'}`}>
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
        
        {/* Scanline effect overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20"></div>
      </div>
    </div>
  );
}
