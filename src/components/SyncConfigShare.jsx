import { useState, useEffect, useMemo } from 'react';
import { X, QrCode, Shield } from 'lucide-react';
import { trackEvent } from '../utils/analytics';

const SyncConfigShare = ({ webdavConfig, onClose, colors }) => {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const shareUrl = useMemo(() => {
    if (!webdavConfig) return '';
    try {
      // 转换为缩写格式以减小 URL 长度
      const configData = {
        s: webdavConfig.server,
        u: webdavConfig.username,
        p: webdavConfig.password,
        t: Date.now()
      };
      
      // 使用 TextEncoder 和 base64 编码
      const jsonStr = JSON.stringify(configData);
      const bytes = new TextEncoder().encode(jsonStr);
      const base64 = btoa(String.fromCharCode(...bytes));
      return `https://ct.jerryz.com.cn/settings?config=${encodeURIComponent(base64)}`;
    } catch (error) {
      console.error('Failed to encode config:', error);
      return '';
    }
  }, [webdavConfig]);

  // 锁定背景滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  useEffect(() => {
    if (webdavConfig && shareUrl) {
      const generateQrCode = async () => {
        try {
          const QRCode = await import('qrcode');
          // 使用黑白配色以获得最佳识别效果
          const dataUrl = await QRCode.toDataURL(shareUrl, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',  // 纯黑色
              light: '#FFFFFF', // 纯白色
            },
            errorCorrectionLevel: 'M', // 中等纠错级别
          });
          setQrCodeUrl(dataUrl);
        } catch (err) {
          console.error('Failed to generate QR code', err);
        }
      };
      generateQrCode();
    }
  }, [webdavConfig, shareUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackEvent('share', { target: 'webdav_config', method: 'copy' });
    } catch (error) {
      console.error('Failed to copy share url:', error);
    }
  };

  return (
    <div
      className="fixed inset-0 flex justify-center items-center z-50 p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)'
      }}
    >
      <div 
        className="rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 border"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <div className="relative p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 transition-colors rounded-full p-1"
            style={{ color: colors.textMuted }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.borderSubtle}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="关闭"
          >
            <X size={24} />
          </button>
          <div className="flex items-center space-x-3 text-lg font-semibold" style={{ color: colors.espresso }}>
            <QrCode size={24} style={{ color: colors.accent }} />
            <span>分享同步配置</span>
          </div>
          <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
            快速将配置和数据导入到其他设备。扫描二维码或在 设置 - WebDAV 同步 - 手动导入配置 中粘贴链接。
          </p>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <div 
            className="rounded-lg p-4 flex justify-center items-center border"
            style={{
              backgroundColor: colors.bgBase,
              borderColor: colors.borderSubtle
            }}
          >
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code" className="w-56 h-56 rounded-md" />
            ) : (
              <div className="w-56 h-56 rounded-md animate-pulse" style={{ backgroundColor: colors.borderStrong }}></div>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full border text-sm rounded-lg p-2.5 pr-20 focus:ring-2 focus:outline-none"
              style={{
                backgroundColor: colors.bgBase,
                borderColor: colors.borderStrong,
                color: colors.textSecondary,
                focusRing: colors.accent
              }}
            />
            <button
              onClick={handleCopy}
              className="absolute inset-y-0 right-0 flex items-center px-4 text-white text-sm font-medium rounded-r-lg transition-colors"
              style={{
                backgroundColor: colors.accent,
                ':hover': { backgroundColor: colors.cappuccino }
              }}
            >
              {copied ? '已复制' : '复制'}
            </button>
          </div>

          <div 
            className="flex items-start p-3 border-l-4 rounded-md"
            style={{
              backgroundColor: colors.warningBg,
              borderColor: colors.warning
            }}
          >
            <Shield size={20} className="flex-shrink-0 mr-2 mt-0.5" style={{ color: colors.warning }} />
            <p className="text-sm" style={{ color: colors.warningText }}>
              <b>安全提醒:</b> 分享链接中包含您的 WebDAV 凭据。请仅分享给您信任的设备。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncConfigShare;
