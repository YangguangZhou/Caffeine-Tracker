import html2canvas from 'html2canvas';

/**
 * 导出DOM元素为图片
 * @param {HTMLElement} element - 要导出的DOM元素
 * @param {Object} options - 导出选项
 * @returns {Promise<Blob>} - 返回图片Blob
 */
export const exportToImage = async (element, options = {}) => {
  if (!element) {
    throw new Error('Element not found');
  }

  const defaultOptions = {
    backgroundColor: '#ffffff',
    scale: 2, // 提高分辨率
    logging: false,
    ...options
  };

  try {
    const canvas = await html2canvas(element, defaultOptions);
    
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png');
    });
  } catch (error) {
    console.error('Error exporting to image:', error);
    throw error;
  }
};

/**
 * 下载图片
 * @param {Blob} blob - 图片Blob
 * @param {string} filename - 文件名
 */
export const downloadImage = (blob, filename = 'chart.png') => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 分享图片（使用 Web Share API 或 Capacitor Share）
 * @param {Blob} blob - 图片Blob
 * @param {string} title - 分享标题
 * @param {string} text - 分享文本
 * @param {Object} Share - Capacitor Share对象（可选）
 * @returns {Promise<boolean>} - 是否成功分享
 */
export const shareImage = async (blob, title = '咖啡因追踪统计', text = '我的咖啡因摄入统计', Share = null) => {
  try {
    // 在原生平台使用 Capacitor Share
    if (Share && typeof Share.share === 'function') {
      // 将 blob 转换为 base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      const base64 = await base64Promise;
      
      await Share.share({
        title,
        text,
        files: [base64],
        dialogTitle: title
      });
      return true;
    }
    
    // 在 Web 平台使用 Web Share API
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], 'chart.png', { type: 'image/png' });
      const shareData = {
        title,
        text,
        files: [file]
      };
      
      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return true;
      }
    }
    
    // 如果不支持分享，则直接下载
    downloadImage(blob, 'chart.png');
    return false;
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error sharing image:', error);
    }
    return false;
  }
};

/**
 * 导出并下载图表
 * @param {string} elementId - 元素ID
 * @param {string} filename - 文件名
 * @param {Object} options - 导出选项
 */
export const exportAndDownload = async (elementId, filename, options = {}) => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const blob = await exportToImage(element, options);
  downloadImage(blob, filename);
};

/**
 * 导出并分享图表
 * @param {string} elementId - 元素ID
 * @param {string} title - 分享标题
 * @param {string} text - 分享文本
 * @param {Object} Share - Capacitor Share对象（可选）
 * @param {Object} options - 导出选项
 */
export const exportAndShare = async (elementId, title, text, Share = null, options = {}) => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const blob = await exportToImage(element, options);
  return await shareImage(blob, title, text, Share);
};
