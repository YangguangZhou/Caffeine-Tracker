import React, { useState } from 'react';
import { Download, Check } from 'lucide-react';
import { exportAndDownload } from '../utils/chartExport';

/**
 * 下载按钮组件
 * 用于导出图表为带社交属性的图片
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.elementId - 要导出的元素ID
 * @param {string} props.filename - 下载文件名
 * @param {string} props.cardTitle - 卡片标题
 * @param {Object} props.colors - 颜色主题
 */
const DownloadButton = ({ 
  elementId, 
  filename = 'caffeine-stats.png',
  cardTitle = '咖啡因追踪统计',
  colors
}) => {
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleDownload = async () => {
    try {
      setExporting(true);
      await exportAndDownload(elementId, filename, {
        cardOptions: {
          title: '咖啡因追踪器',
          description: '科学管理您的咖啡因摄入',
          url: 'https://ct.jerryz.com.cn',
          cardTitle
        }
      });
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="p-2 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
      style={{ color: colors.textSecondary }}
      title="下载图表"
      disabled={exporting}
    >
      {exportSuccess ? (
        <Check size={18} style={{ color: colors.safe }} />
      ) : (
        <Download size={18} />
      )}
    </button>
  );
};

export default DownloadButton;
