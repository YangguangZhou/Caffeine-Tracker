import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Server, User, KeyRound, Download, Camera, X, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { decodeConfigFromUrl, isValidConfig, getServerDisplayName } from '../utils/syncConfigShare';

const CustomModal = ({ children, colors }) => (
  <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
    <div 
      className="rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 p-6 border"
      style={{
        backgroundColor: colors.bgCard,
        borderColor: colors.borderSubtle
      }}
    >
      {children}
    </div>
  </div>
);

const SyncImportView = ({ onImportConfig, isNativePlatform, colors }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [configData, setConfigData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [importStatus, setImportStatus] = useState(''); // '', 'syncing', 'success', 'failed'

  useEffect(() => {
    const configParam = searchParams.get('config');
    if (configParam) {
      // 重定向到设置页面处理导入
      navigate(`/settings?config=${configParam}`, { replace: true });
      return;
    }
    setLoading(false);
  }, [searchParams, navigate]);

  const handleManualUrlParse = () => {
    if (!manualUrl) return;
    try {
      const url = new URL(manualUrl);
      // The config is in the hash part of the URL
      const hashParams = new URLSearchParams(url.hash.substring(url.hash.indexOf('?') + 1));
      const configParam = hashParams.get('config');
      
      if (configParam) {
        const decoded = decodeConfigFromUrl(configParam);
        if (decoded && isValidConfig(decoded)) {
          setConfigData(decoded);
          setShowConfirmation(true);
          setError('');
        } else {
          setError('链接中的配置数据无效。');
        }
      } else {
        setError('链接中未找到配置参数。');
      }
    } catch (err) {
      setError('无法解析输入的内容，请确保是有效的URL。');
    }
  };

  const handleScan = async () => {
    if (!isNativePlatform || !Capacitor.isPluginAvailable('BarcodeScanner')) {
      setError('扫码功能仅在原生App中可用。');
      return;
    }
    try {
      const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
      await BarcodeScanner.checkPermission({ force: true });
      document.body.style.background = "transparent";
      const result = await BarcodeScanner.startScan();
      document.body.style.background = "";
      if (result.hasContent) {
        setManualUrl(result.content);
        // Use a slight delay to allow the UI to update with the pasted URL
        setTimeout(handleManualUrlParse, 100);
      }
    } catch (err) {
      document.body.style.background = "";
      setError('扫码失败，请重试。');
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

  const renderConfirmationModal = () => {
    if (!showConfirmation) return null;

    if (importStatus) {
      return (
        <CustomModal colors={colors}>
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
                  onClick={() => navigate('/settings')} 
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
                  onClick={() => { setShowConfirmation(false); setImportStatus(''); setError(''); }} 
                  className="mt-6 w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors border"
                  style={{
                    color: colors.textSecondary,
                    backgroundColor: colors.bgBase,
                    borderColor: colors.borderStrong
                  }}
                >
                  关闭
                </button>
              </>
            )}
          </div>
        </CustomModal>
      );
    }

    return (
      <CustomModal colors={colors}>
        <h3 className="text-lg font-semibold flex items-center" style={{ color: colors.espresso }}>
          <ShieldCheck size={22} className="mr-2" style={{ color: colors.accent }} />
          确认导入配置
        </h3>
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
            backgroundColor: colors.warningBg,
            borderColor: colors.warning
          }}
        >
          <p className="text-sm" style={{ color: colors.warningText }}>
            <b>重要:</b> 导入将使用此配置覆盖您当前的 WebDAV 设置，并从服务器同步数据，这可能会覆盖您本地的记录。
          </p>
        </div>
        <div className="flex justify-end space-x-3">
          <button 
            onClick={() => setShowConfirmation(false)} 
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
            onClick={handleConfirmImport}
            disabled={importing}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
            style={{ backgroundColor: colors.accent }}
          >
            <Download size={18} className="mr-2" />
            确认并导入
          </button>
        </div>
      </CustomModal>
    );
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div 
        className="rounded-2xl shadow-xl p-6 border"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ color: colors.espresso }}>导入 WebDAV 配置</h2>
          <button 
            onClick={() => navigate('/settings')} 
            className="transition-colors rounded-full p-1 hover:bg-opacity-10"
            style={{ 
              color: colors.textMuted,
              ':hover': { backgroundColor: colors.borderStrong }
            }}
          >
            <X size={24} />
          </button>
        </div>

        {error && !showConfirmation && (
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

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 size={32} className="animate-spin" style={{ color: colors.accent }} />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label 
                htmlFor="manualUrl" 
                className="block text-sm font-medium mb-1"
                style={{ color: colors.textSecondary }}
              >
                粘贴配置链接
              </label>
              <div className="flex rounded-lg shadow-sm">
                <input
                  type="text"
                  id="manualUrl"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://ct.jerryz.com.cn/settings?config=..."
                  className="flex-1 block w-full min-w-0 border rounded-l-lg p-2.5 text-sm focus:ring-2 focus:outline-none"
                  style={{
                    backgroundColor: colors.bgBase,
                    borderColor: colors.borderStrong,
                    color: colors.textPrimary
                  }}
                />
                <button
                  onClick={handleManualUrlParse}
                  className="inline-flex items-center px-3 text-sm text-white border-transparent rounded-r-lg transition-colors"
                  style={{ backgroundColor: colors.accent }}
                >
                  解析
                </button>
              </div>
            </div>
            {isNativePlatform && (
              <>
                <div className="relative flex items-center">
                  <div className="flex-grow border-t" style={{ borderColor: colors.borderSubtle }}></div>
                  <span className="flex-shrink mx-4 text-xs" style={{ color: colors.textMuted }}>或</span>
                  <div className="flex-grow border-t" style={{ borderColor: colors.borderSubtle }}></div>
                </div>
                <button
                  onClick={handleScan}
                  className="w-full flex justify-center items-center py-2.5 px-5 text-sm font-medium rounded-lg border focus:z-10 focus:ring-2 transition-colors"
                  style={{
                    color: colors.textPrimary,
                    backgroundColor: colors.bgBase,
                    borderColor: colors.borderStrong
                  }}
                >
                  <Camera size={20} className="mr-2" />
                  扫描二维码
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {renderConfirmationModal()}
    </div>
  );
};

export default SyncImportView;
