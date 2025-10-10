import React, { useState } from 'react';
import { Share2, Download, Check } from 'lucide-react';
import { exportAndDownload, exportAndShare } from '../utils/chartExport';

/**
 * 分享按钮组件
 * 用于导出和分享图表
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.elementId - 要导出的元素ID
 * @param {string} props.filename - 下载文件名
 * @param {string} props.shareTitle - 分享标题
 * @param {string} props.shareText - 分享文本
 * @param {Object} props.colors - 颜色主题
 * @param {Object} props.Share - Capacitor Share对象（可选）
 */
const ShareButton = ({ 
  elementId, 
  filename = 'caffeine-stats.png',
  shareTitle = '咖啡因追踪统计',
  shareText = '我的咖啡因摄入统计',
  colors,
  Share = null
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleDownload = async () => {
    try {
      setExporting(true);
      await exportAndDownload(elementId, filename);
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        setShowMenu(false);
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    try {
      setExporting(true);
      const shared = await exportAndShare(elementId, shareTitle, shareText, Share);
      
      if (shared) {
        setExportSuccess(true);
        setTimeout(() => {
          setExportSuccess(false);
          setShowMenu(false);
        }, 2000);
      } else {
        // 如果不支持分享，已经自动下载了
        setExportSuccess(true);
        setTimeout(() => {
          setExportSuccess(false);
          setShowMenu(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Share failed:', error);
      alert('分享失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 rounded-md transition-colors hover:bg-gray-100"
        style={{ color: colors.textSecondary }}
        title="导出或分享"
        disabled={exporting}
      >
        {exportSuccess ? (
          <Check size={18} style={{ color: colors.safe }} />
        ) : (
          <Share2 size={18} />
        )}
      </button>

      {showMenu && !exportSuccess && (
        <div 
          className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-50 overflow-hidden"
          style={{ 
            borderColor: colors.borderSubtle,
            minWidth: '120px'
          }}
        >
          <button
            onClick={handleDownload}
            disabled={exporting}
            className="w-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
            style={{ color: colors.textPrimary }}
          >
            <Download size={16} />
            <span>{exporting ? '导出中...' : '保存图片'}</span>
          </button>
          
          <button
            onClick={handleShare}
            disabled={exporting}
            className="w-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors text-left border-t"
            style={{ 
              color: colors.textPrimary,
              borderColor: colors.borderSubtle
            }}
          >
            <Share2 size={16} />
            <span>{exporting ? '分享中...' : '分享'}</span>
          </button>
        </div>
      )}

      {/* 点击外部关闭菜单 */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default ShareButton;
