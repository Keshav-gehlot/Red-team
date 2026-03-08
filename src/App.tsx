import React, { useState, useEffect, useRef } from 'react';
import { Upload, File, Lock, Terminal, Shield, Download, Server, HardDrive, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

  const getLogColor = (logText: string) => {
    if (logText.includes('[ERROR]')) return 'text-red-400';
    if (logText.includes('[WARN]')) return 'text-amber-400';
    if (logText.includes('[SUCCESS]')) return 'text-emerald-400';
    return 'text-zinc-400';
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans flex flex-col overflow-hidden selection:bg-blue-500/30">
      
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-zinc-100 tracking-wide text-sm">ThreatOps Platform</span>
          </div>
          <div className="h-4 w-px bg-zinc-800 mx-2"></div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Endpoint Connected
          </div>
        </div>
        
        <div className="flex items-center gap-6 text-xs text-zinc-400 font-medium">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-zinc-500" />
            <span>Target Volume: /target_data</span>
          </div>
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-zinc-500" />
            <span>Files Identified: {files.length}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden relative z-10 bg-[#09090b]">
        
        {/* Left Panel: File System View */}
        <div className="w-full md:w-1/3 border border-zinc-800 rounded-lg flex flex-col bg-[#0c0c0e] shadow-lg overflow-hidden">
          
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#09090b]">
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              Endpoint File System
            </h2>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <button 
              onClick={handleUploadClick}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-md transition-all flex items-center gap-2 text-xs font-medium border border-zinc-700 shadow-sm"
              title="Upload File to Endpoint"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-[#0c0c0e]">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm gap-2">
                <HardDrive className="w-8 h-8 opacity-20" />
                <span>No files found on target volume</span>
              </div>
            ) : (
              <ul className="space-y-1.5">
                <AnimatePresence>
                  {files.map((filename) => {
                    const isEncrypted = filename.endsWith('.txt');
                    
                    return (
                      <motion.li 
                        key={filename}
                        layout
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
                        className={`flex items-center justify-between p-2.5 rounded-md transition-colors group border ${
                          isEncrypted 
                            ? 'bg-[#181010] border-red-900/40 hover:border-red-800/60' 
                            : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden pr-2">
                          {isEncrypted ? (
                            <Lock className="w-4 h-4 text-red-400 shrink-0" />
                          ) : (
                            <File className="w-4 h-4 text-blue-400 shrink-0" />
                          )}
                          
                          <span className={`truncate text-sm font-medium ${isEncrypted ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                            {filename}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          
                          {/* Execute/Lock Button */}
                          {!isEncrypted && (
                            <button
                              onClick={() => handleEncrypt(filename)}
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-red-950 text-red-400 hover:text-red-300 border border-zinc-700 hover:border-red-800 rounded text-[11px] font-semibold transition-colors"
                            >
                              Encrypt
                            </button>
                          )}

                          {/* Download Button */}
                          <button
                            onClick={() => handleDownload(filename)}
                            className={`p-1.5 rounded transition-colors border border-transparent ${
                              isEncrypted 
                                ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 hover:border-zinc-700' 
                                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
                            }`}
                            title="Download File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </div>

        {/* Right Panel: Operations Event Log */}
        <div className="w-full md:w-2/3 border border-zinc-800 rounded-lg flex flex-col bg-[#0c0c0e] shadow-lg overflow-hidden">
          
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-[#09090b]">
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-zinc-500" />
              Event Logs
            </h2>
            <button 
              onClick={fetchFiles}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
              title="Refresh State"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#09090b] font-mono text-[13px] tracking-tight">
            <AnimatePresence initial={false}>
              {logs.map((log, index) => (
                <motion.div 
                  key={index} 
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`${getLogColor(log)} break-words py-0.5`}
                >
                  {log}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logsEndRef} className="h-4" />
          </div>
          
        </div>

      </div>
    </div>
  );
}
