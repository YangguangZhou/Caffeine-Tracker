import { useState, useEffect } from 'react';
import { X, Link, ShieldCheck, Server, User, KeyRound, Download, Loader2, Camera, Copy, Check } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { decodeConfigFromUrl, isValidConfig, getServerDisplayName, extractConfigParam } from '../utils/syncConfigShare';

const ManualImportModal = ({ onClose, colors, onImportConfig, initialConfigParam, isNativePlatform, initialScannedContent }) => {
  const [url, setUrl] = useState('');
  const [configData, setConfigData] = useState(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(''); // '', 'syncing', 'success', 'failed'
  const [scannedLink, setScannedLink] = useState(initialScannedContent || '');
  const [copied, setCopied] = useState(false);

  // 锁定背景滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // 如果有 initialConfigParam，自动解析
  useEffect(() => {
    if (initialConfigParam && !scannedLink) {
      try {
        const decoded = decodeConfigFromUrl(initialConfigParam);
        if (decoded && isValidConfig(decoded)) {
          setConfigData(decoded);
          setError('');
        } else {
          setError('链接中的配置数据无效。');
        }
      } catch (err) {
        setError('无法解析配置链接。');
      }
    }
  }, [initialConfigParam]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url) return;
    try {
      const trimmed = url.trim();
      const configParam = extractConfigParam(trimmed);
      const candidate = configParam || (!/^https?:/i.test(trimmed) ? trimmed : null);

      if (candidate) {
        const decoded = decodeConfigFromUrl(candidate);
        if (decoded && isValidConfig(decoded)) {
          setConfigData(decoded);
          setError('');
          return;
        }
        setError('链接中的配置数据无效。');
        return;
      }
      setError('提供的URL中未找到配置信息。');
    } catch (error) {
      setError('无效的URL格式。');
    }
  };

  const handleConfirmImport = async () => {
    if (!configData) return;
    setImporting(true);
    setImportStatus('syncing');
    setError('');
    try {
      await onImportConfig(configData);
      setImportStatus('success');
    } catch (err) {
      console.error('导入配置时发生错误:', err);
      setError(err.message || '导入配置时发生未知错误');
      setImportStatus('failed');
    } finally {
      setImporting(false);
    }
  };

  const handleBack = () => {
    setConfigData(null);
    setImportStatus('');
    setError('');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(scannedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
      setError('复制失败，请手动复制。');
    }
  };

  return (
    <div
      className="fixed inset-0 flex justify-center items-center z-50 p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
      }}
    >
      <div 
        className="rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-300 border bg-white dark:bg-gray-800"
        style={{
          borderColor: colors.borderSubtle,
          backgroundColor: colors.bgCard
        }}
      >
        {/* 如果正在导入或已完成 */}
        {importStatus ? (
          <div className="text-center">
            {importStatus === 'syncing' && (
              <>
                <Loader2 size={48} className="animate-spin mx-auto" style={{ color: colors.accent }} />
                <h3 className="text-lg font-semibold mt-4" style={{ color: colors.espresso }}>正在同步...</h3>
                <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>正在从服务器拉取数据，请稍候。</p>
              </>
            )}
            {importStatus === 'success' && (
              <>
                <ShieldCheck size={48} className="mx-auto" style={{ color: colors.safe }} />
                <h3 className="text-lg font-semibold mt-4" style={{ color: colors.espresso }}>导入并同步成功</h3>
                <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>您的设备现已配置完毕。</p>
                <button 
                  onClick={onClose} 
                  className="mt-6 w-full px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                  style={{ backgroundColor: colors.accent }}
                >
                  完成
                </button>
              </>
            )}
            {importStatus === 'failed' && (
              <>
                <X size={48} className="mx-auto" style={{ color: colors.danger }} />
                <h3 className="text-lg font-semibold mt-4" style={{ color: colors.espresso }}>导入失败</h3>
                <p className="text-sm mt-2 break-all" style={{ color: colors.dangerText }}>{error}</p>
                <button 
                  onClick={handleBack} 
                  className="mt-6 w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors border"
                  style={{
                    color: colors.textSecondary,
                    backgroundColor: colors.bgBase,
                    borderColor: colors.borderStrong
                  }}
                >
                  返回
                </button>
              </>
            )}
          </div>
        ) : scannedLink ? (
          /* 显示扫描到的链接 */
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: colors.espresso }}>扫描结果</h3>
              <button 
                onClick={onClose} 
                className="transition-colors rounded-full p-1"
                style={{ color: colors.textMuted }}
              >
                <X size={24} />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                扫描到的链接：
              </p>
              <div 
                className="p-3 rounded-lg border break-all text-sm mb-3 max-h-32 overflow-y-auto"
                style={{
                  backgroundColor: colors.bgBase,
                  borderColor: colors.borderStrong,
                  color: colors.textPrimary
                }}
              >
                {scannedLink}
              </div>
              <button
                onClick={handleCopyLink}
                className="w-full py-2 px-4 rounded-lg flex items-center justify-center text-sm font-medium transition-colors"
                style={{
                  backgroundColor: copied ? colors.safeBg : colors.accent,
                  color: copied ? colors.safeText : '#fff',
                  border: copied ? `1px solid ${colors.safe}` : 'none'
                }}
              >
                {copied ? (
                  <>
                    <Check size={16} className="mr-2" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy size={16} className="mr-2" />
                    复制链接
                  </>
                )}
              </button>
            </div>
            <div 
              className="p-3 border-l-4 rounded-md mb-4"
              style={{
                backgroundColor: colors.infoBg,
                borderColor: colors.info
              }}
            >
              <p className="text-sm" style={{ color: colors.infoText }}>
                <b>提示:</b> 导入移动端App的数据需要复制该链接，然后在设置中的“手动导入配置”处粘贴并导入。
              </p>
            </div>
            <div className="flex justify-end">
              <button 
                onClick={onClose} 
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border"
                style={{
                  color: colors.textSecondary,
                  backgroundColor: colors.bgBase,
                  borderColor: colors.borderStrong
                }}
              >
                关闭
              </button>
            </div>
          </>
        ) : configData ? (
          /* 显示确认导入界面 */
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center" style={{ color: colors.espresso }}>
                <ShieldCheck size={22} className="mr-2" style={{ color: colors.accent }} />
                确认导入配置
              </h3>
              <button 
                onClick={onClose} 
                className="transition-colors rounded-full p-1"
                style={{ color: colors.textMuted }}
              >
                <X size={24} />
              </button>
            </div>
            <div className="my-4 space-y-2 text-sm" style={{ color: colors.textSecondary }}>
              <p className="flex items-center">
                <Server size={16} className="mr-2" style={{ color: colors.textMuted }} />
                <b>服务器:</b> <span className="ml-2 font-mono">{getServerDisplayName(configData.server)}</span>
              </p>
              <p className="flex items-center">
                <User size={16} className="mr-2" style={{ color: colors.textMuted }} />
                <b>用户名:</b> <span className="ml-2 font-mono">{configData.username}</span>
              </p>
              <p className="flex items-center">
                <KeyRound size={16} className="mr-2" style={{ color: colors.textMuted }} />
                <b>密码:</b> <span className="ml-2 font-mono" style={{ color: colors.textMuted }}>●●●●●●●●</span>
              </p>
            </div>
            <div 
              className="p-3 border-l-4 rounded-md mb-4"
              style={{
                backgroundColor: colors.dangerBg,
                borderColor: colors.danger,
              }}
            >
              <p className="text-sm font-medium" style={{ color: colors.dangerText }}>
                <b>警告:</b> 导入将使用此配置覆盖您当前的 WebDAV 设置，并从服务器强制同步数据，这将会<b>完全覆盖</b>您本地的所有记录。
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={handleBack} 
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border"
                style={{
                  color: colors.textSecondary,
                  backgroundColor: colors.bgBase,
                  borderColor: colors.borderStrong
                }}
              >
                返回
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
                style={{ backgroundColor: colors.accent }}
              >
                <Download size={18} className="mr-2" />
                确认并导入
              </button>
            </div>
          </>
        ) : (
          /* 显示URL输入界面 */
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: colors.espresso }}>手动导入配置</h3>
              <button 
                onClick={onClose} 
                className="transition-colors rounded-full p-1"
                style={{ color: colors.textMuted }}
              >
                <X size={24} />
              </button>
            </div>
            {error && (
              <div 
                className="p-3 border-l-4 rounded-md mb-4 text-sm"
                style={{
                  backgroundColor: colors.dangerBg,
                  borderColor: colors.danger,
                  color: colors.dangerText
                }}
              >
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                请粘贴从另一台设备分享的完整配置链接
              </p>
              <div className="relative">
                <Link size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textMuted }} />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://ct.jerryz.com.cn/settings?config=..."
                  className="w-full border rounded-lg p-3 pl-10 text-sm focus:ring-2 focus:outline-none"
                  style={{
                    backgroundColor: colors.bgBase,
                    borderColor: colors.borderStrong,
                    color: colors.textPrimary
                  }}
                  required
                />
              </div>
              
              {/* 添加扫码按钮 - 已移除，因依赖缺失导致崩溃 */}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border"
                  style={{
                    color: colors.textSecondary,
                    backgroundColor: colors.bgBase,
                    borderColor: colors.borderStrong
                  }}
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                  style={{ backgroundColor: colors.accent }}
                >
                  解析配置
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ManualImportModal;
