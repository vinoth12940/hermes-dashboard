"use client";

import { useState, useEffect } from 'react';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { 
  FileCode, Folder, ChevronRight, File, Save, ArrowLeft, 
  FileText, Settings, Brain, Sparkles, RefreshCw
} from 'lucide-react';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
}

const quickAccess = [
  { name: 'config.yaml', path: 'config.yaml', icon: Settings, desc: 'Main configuration' },
  { name: 'Agent.md', path: 'hermes-agent/AGENTS.md', icon: FileCode, desc: 'Agent development guide' },
  { name: 'Soul.md', path: 'soul.md', icon: Sparkles, desc: 'Agent personality' },
  { name: '.env', path: '.env', icon: FileText, desc: 'Environment variables & API keys' },
  { name: 'User Profile', path: 'memory/user.md', icon: Brain, desc: 'User memory' },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string) {
  if (name.endsWith('.yaml') || name.endsWith('.yml')) return Settings;
  if (name.endsWith('.md')) return FileText;
  if (name.endsWith('.log')) return FileText;
  if (name.endsWith('.json')) return FileCode;
  if (name.endsWith('.py')) return FileCode;
  if (name.endsWith('.ts')) return FileCode;
  if (name.endsWith('.js')) return FileCode;
  return File;
}

export default function FilesPage() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);

  const fetchDirectory = async (dirPath: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files?list=true&path=${encodeURIComponent(dirPath)}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setCurrentPath(data.currentPath);
      }
    } catch {}
    setLoading(false);
  };

  const fetchFile = async (filePath: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
        setOriginalContent(data.content);
        setViewingFile(filePath);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchDirectory('');
  }, []);

  const navigateTo = (dirPath: string) => {
    setViewingFile(null);
    const newHistory = [...pathHistory.slice(0, historyIndex + 1), dirPath];
    setPathHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    fetchDirectory(dirPath);
  };

  const goBack = () => {
    if (viewingFile) {
      setViewingFile(null);
      return;
    }
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      fetchDirectory(pathHistory[historyIndex - 1]);
    }
  };

  const saveFile = async () => {
    if (!viewingFile) return;
    setSaving(true);
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: viewingFile, content: fileContent }),
      });
      if (res.ok) {
        setMessage('File saved');
        setOriginalContent(fileContent);
      } else {
        setMessage('Save failed');
      }
    } catch {
      setMessage('Save error');
    }
    setSaving(false);
    setConfirmSave(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const hasChanges = fileContent !== originalContent;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Files</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {viewingFile ? viewingFile : `~/.hermes${currentPath}`}
          </p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-3">
            <Badge variant="warning">Unsaved changes</Badge>
            <button
              onClick={() => setConfirmSave(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium text-sm hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Quick Access */}
      {!viewingFile && currentPath === '' && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 mb-3">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickAccess.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => fetchFile(item.path)}
                  className="glass-card p-4 text-left hover:border-indigo-500/20 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800/80 flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                      <Icon className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{item.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                      <p className="text-xs text-zinc-600 font-mono mt-1">{item.path}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* File Viewer */}
      {viewingFile && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-zinc-800/50">
            <button onClick={goBack} className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <FileText className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-mono text-zinc-300">{viewingFile}</span>
            {message && <Badge variant={message.includes('failed') ? 'error' : 'success'}>{message}</Badge>}
          </div>
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            className="w-full h-[60vh] bg-zinc-900/50 text-zinc-300 font-mono text-sm p-4 resize-none border-none focus:ring-0 leading-relaxed"
            spellCheck={false}
          />
        </div>
      )}

      {/* Directory listing */}
      {!viewingFile && currentPath !== '' && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-zinc-800/50">
            <button onClick={goBack} className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Folder className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-mono text-zinc-300">~/.hermes{currentPath}</span>
          </div>
          <div className="divide-y divide-zinc-800/30">
            {items.map((item, i) => {
              const Icon = item.type === 'directory' ? Folder : getFileIcon(item.name);
              return (
                <button
                  key={item.path}
                  onClick={() => item.type === 'directory' ? navigateTo(item.path) : fetchFile(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors text-left"
                >
                  <Icon className={`w-4 h-4 ${item.type === 'directory' ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  <span className="text-sm text-zinc-300 flex-1">{item.name}</span>
                  {item.type === 'directory' && <ChevronRight className="w-4 h-4 text-zinc-600" />}
                  {item.type === 'file' && <span className="text-xs text-zinc-600">{formatSize(item.size)}</span>}
                </button>
              );
            })}
            {items.length === 0 && !loading && (
              <div className="p-8 text-center text-zinc-500 text-sm">Empty directory</div>
            )}
          </div>
        </div>
      )}

      {/* Root directory listing */}
      {!viewingFile && currentPath === '' && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-zinc-800/50">
            <h2 className="text-sm font-semibold text-zinc-400">Directory Contents</h2>
          </div>
          <div className="divide-y divide-zinc-800/30">
            {items.map((item) => {
              const Icon = item.type === 'directory' ? Folder : getFileIcon(item.name);
              return (
                <button
                  key={item.path}
                  onClick={() => item.type === 'directory' ? navigateTo(item.path) : fetchFile(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors text-left"
                >
                  <Icon className={`w-4 h-4 ${item.type === 'directory' ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  <span className="text-sm text-zinc-300 flex-1">{item.name}</span>
                  {item.type === 'directory' && <ChevronRight className="w-4 h-4 text-zinc-600" />}
                  {item.type === 'file' && <span className="text-xs text-zinc-600">{formatSize(item.size)}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmSave}
        title="Save File"
        message={`Save changes to ${viewingFile}? This will modify the actual file on disk.`}
        confirmText="Save"
        onConfirm={saveFile}
        onCancel={() => setConfirmSave(false)}
      />
    </div>
  );
}
