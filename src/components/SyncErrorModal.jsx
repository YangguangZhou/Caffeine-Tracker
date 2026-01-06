import React, { useEffect } from 'react';
import { X, AlertTriangle, Smartphone, Mail, RefreshCw } from 'lucide-react';
import { generateFeedbackMailto } from '../utils/feedbackUtils';

/**
 * WebDAV 同步错误弹窗组件
 */
const SyncErrorModal = ({ error, onClose, onRetry, colors, appConfig, isNativePlatform, logs }) => {
  // 锁定背景滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!error) return null;

  const handleContactSupport = () => {
    const mailtoLink = generateFeedbackMailto('sync_error', appConfig, isNativePlatform, error, logs);
    window.open(mailtoLink);
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
          
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle size={24} style={{ color: colors.danger }} />
            <h3 className="text-lg font-semibold" style={{ color: colors.espresso }}>
              同步失败
            </h3>
          </div>
          
          <div
            className="p-3 rounded-lg border mb-4"
            style={{
              backgroundColor: colors.dangerBg,
              borderColor: colors.danger
            }}
          >
            <p className="text-sm break-words" style={{ color: colors.dangerText }}>
              {error}
            </p>
          </div>

          <div className="space-y-3 text-sm" style={{ color: colors.textSecondary }}>
            <p className="font-medium">故障排查建议：</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>检查网络连接是否正常</li>
              <li>验证 WebDAV 服务器地址、用户名和密码</li>
              <li>确认 WebDAV 服务已启用</li>
              <li>尝试在设置页面点击"测试连接"</li>
            </ul>

            <div 
              className="mt-4 p-3 border rounded-lg"
              style={{
                backgroundColor: colors.infoBg,
                borderColor: colors.info
              }}
            >
              <p className="font-medium flex items-center mb-2" style={{ color: colors.infoText }}>
                <Smartphone size={14} className="mr-1.5" />
                推荐解决方案
              </p>
              <p className="text-xs" style={{ color: colors.infoText }}>
                Android APP 不受浏览器限制，同步成功率更高。
              </p>
              <a
                href={appConfig.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-xs underline"
                style={{ color: colors.infoText }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                下载 Android APP →
              </a>
            </div>

            <div 
              className="p-3 border rounded-lg"
              style={{
                backgroundColor: colors.bgBase,
                borderColor: colors.borderStrong
              }}
            >
              <p className="font-medium flex items-center mb-2" style={{ color: colors.textPrimary }}>
                <Mail size={14} className="mr-1.5" />
                联系技术支持
              </p>
              <button
                onClick={handleContactSupport}
                className="inline-block text-xs underline text-left"
                style={{ color: colors.textSecondary }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                发送错误报告邮件 (i@jerryz.com.cn)
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
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
            {onRetry && (
              <button
                onClick={() => {
                  onClose();
                  onRetry();
                }}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center"
                style={{ backgroundColor: colors.accent }}
              >
                <RefreshCw size={16} className="mr-1.5" />
                重试
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncErrorModal;
