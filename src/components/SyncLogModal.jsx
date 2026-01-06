import React, { useEffect, useRef } from 'react';
import { X, Terminal, Copy, Download } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

const SyncLogModal = ({ logs, onClose, colors }) => {
  const logsEndRef = useRef(null);

  // 锁定背景滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleCopyLogs = () => {
    const text = (logs || []).map(l => `[${l.time || new Date(l.timestamp).toLocaleString()}] ${l.type.toUpperCase()}: ${l.message}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      alert('日志已复制到剪贴板');
    });
  };

  const handleDownloadLogs = async () => {
    const text = (logs || []).map(l => `[${l.time || new Date(l.timestamp).toLocaleString()}] ${l.type.toUpperCase()}: ${l.message}`).join('\n');
    
    if (Capacitor.isNativePlatform()) {
      try {
         await Share.share({
          title: 'Caffeine Tracker Logs',
          text: text,
          dialogTitle: '分享日志',
        });
      } catch (e) {
        console.error('Share failed', e);
      }
    } else {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `caffeine-tracker-logs-${new Date().toISOString().slice(0,19).replace(/[:.]/g, '-')}.log`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        style={{ backgroundColor: colors.bgCard, color: colors.textPrimary }}
      >
        <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: colors.borderSubtle }}>
          <h3 className="font-bold text-lg flex items-center">
            <Terminal size={20} className="mr-2" />
            同步日志
          </h3>
          <div className="flex items-center space-x-2">
             <button 
              onClick={handleDownloadLogs}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="下载/分享日志"
            >
              <Download size={18} />
            </button>
            <button 
              onClick={handleCopyLogs}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="复制日志"
            >
              <Copy size={18} />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="关闭"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-gray-50 dark:bg-gray-900/50">
          {logs && logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index} className="break-words border-b border-dashed border-gray-200 dark:border-gray-800 pb-1 mb-1 last:border-0 last:mb-0 last:pb-0">
                <span className="opacity-50 mr-2 text-[10px]">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className={
                  log.type === 'error' ? 'text-red-600 dark:text-red-400 font-bold' : 
                  log.type === 'warn' ? 'text-orange-600 dark:text-orange-400' : 
                  log.type === 'success' ? 'text-green-600 dark:text-green-400' :
                  'text-gray-700 dark:text-gray-300'
                }>
                  {log.message}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center opacity-50 py-8">暂无日志</div>
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default SyncLogModal;
