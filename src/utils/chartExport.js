import html2canvas from 'html2canvas';

/**
 * 创建社交分享卡片装饰层
 * @param {HTMLElement} element - 原始元素
 * @param {Object} options - 配置选项
 * @returns {HTMLElement} - 包含装饰的新元素
 */
const createSocialCard = (element, options = {}) => {
  const {
    title = '咖啡因追踪器',
    description = '科学管理您的咖啡因摄入',
    url = 'https://ct.jerryz.com.cn',
    timestamp = new Date().toLocaleDateString('zh-CN')
  } = options;

  // 创建容器
  const container = document.createElement('div');
  container.style.cssText = `
    background: linear-gradient(135deg, #FFF8E7 0%, #FFEFD5 100%);
    padding: 40px;
    border-radius: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    min-width: 800px;
  `;

  // 顶部 Logo 和标题栏
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32px;
    padding-bottom: 20px;
    border-bottom: 2px solid rgba(217, 119, 6, 0.2);
  `;

  // Logo 和应用名称
  const logoSection = document.createElement('div');
  logoSection.style.cssText = `
    display: flex;
    align-items: center;
    gap: 16px;
  `;

  const logoIcon = document.createElement('div');
  logoIcon.style.cssText = `
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);
  `;
  logoIcon.textContent = '☕';

  const titleSection = document.createElement('div');
  const appTitle = document.createElement('div');
  appTitle.style.cssText = `
    font-size: 28px;
    font-weight: 700;
    color: #78350F;
    margin-bottom: 4px;
  `;
  appTitle.textContent = title;

  const appSubtitle = document.createElement('div');
  appSubtitle.style.cssText = `
    font-size: 14px;
    color: #92400E;
  `;
  appSubtitle.textContent = description;

  titleSection.appendChild(appTitle);
  titleSection.appendChild(appSubtitle);
  logoSection.appendChild(logoIcon);
  logoSection.appendChild(titleSection);

  // 二维码区域
  const qrSection = document.createElement('div');
  qrSection.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  `;

  const qrCode = document.createElement('div');
  qrCode.style.cssText = `
    width: 100px;
    height: 100px;
    background: white;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: #78350F;
    text-align: center;
    padding: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 2px solid #F59E0B;
  `;
  qrCode.innerHTML = `
    <div style="line-height: 1.4;">
      <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">扫码体验</div>
      <div style="font-size: 10px; color: #92400E;">ct.jerryz.com.cn</div>
    </div>
  `;

  qrSection.appendChild(qrCode);

  header.appendChild(logoSection);
  header.appendChild(qrSection);

  // 克隆原始内容
  const contentClone = element.cloneNode(true);
  
  // 移除克隆内容中的下载按钮和下拉菜单
  const buttons = contentClone.querySelectorAll('button[title*="下载"], button[title*="导出"], .absolute.right-0.top-full');
  buttons.forEach(btn => {
    if (btn.parentElement) {
      btn.parentElement.remove();
    }
  });

  // 内容区域
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 24px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  `;
  content.appendChild(contentClone);

  // 底部信息栏
  const footer = document.createElement('div');
  footer.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 20px;
    border-top: 2px solid rgba(217, 119, 6, 0.2);
    color: #92400E;
    font-size: 14px;
  `;

  const footerLeft = document.createElement('div');
  footerLeft.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 4px;">📊 ${title}</div>
    <div style="font-size: 12px; color: #A16207;">科学管理咖啡因摄入，守护您的健康生活</div>
  `;

  const footerRight = document.createElement('div');
  footerRight.style.cssText = 'text-align: right;';
  footerRight.innerHTML = `
    <div style="font-weight: 600; color: #D97706; margin-bottom: 4px;">${url}</div>
    <div style="font-size: 12px; color: #A16207;">生成时间: ${timestamp}</div>
  `;

  footer.appendChild(footerLeft);
  footer.appendChild(footerRight);

  // 组装所有部分
  container.appendChild(header);
  container.appendChild(content);
  container.appendChild(footer);

  return container;
};

/**
 * 导出DOM元素为带社交装饰的图片
 * @param {HTMLElement} element - 要导出的DOM元素
 * @param {Object} options - 导出选项
 * @returns {Promise<Blob>} - 返回图片Blob
 */
export const exportToImage = async (element, options = {}) => {
  if (!element) {
    throw new Error('Element not found');
  }

  // 创建临时容器
  const tempContainer = document.createElement('div');
  tempContainer.style.cssText = `
    position: fixed;
    top: -10000px;
    left: -10000px;
    z-index: -1;
  `;
  document.body.appendChild(tempContainer);

  try {
    // 创建社交卡片
    const socialCard = createSocialCard(element, options.cardOptions || {});
    tempContainer.appendChild(socialCard);

    const defaultOptions = {
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      ...options
    };

    const canvas = await html2canvas(socialCard, defaultOptions);
    
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
  } finally {
    // 清理临时容器
    document.body.removeChild(tempContainer);
  }
};

/**
 * 下载图片
 * @param {Blob} blob - 图片Blob
 * @param {string} filename - 文件名
 */
export const downloadImage = (blob, filename = 'caffeine-tracker-stats.png') => {
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
