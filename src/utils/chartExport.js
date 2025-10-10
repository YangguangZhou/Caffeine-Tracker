import html2canvas from 'html2canvas';

/**
 * 检测当前是否为深色模式
 */
const isDarkMode = () => {
  return document.documentElement.classList.contains('dark') ||
         window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * 获取主题颜色
 */
const getThemeColors = (isDark) => {
  if (isDark) {
    return {
      bgGradientStart: '#1F2937',
      bgGradientEnd: '#111827',
      cardBg: '#374151',
      borderColor: 'rgba(156, 163, 175, 0.2)',
      primaryText: '#F3F4F6',
      secondaryText: '#D1D5DB',
      accentBg: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
      accentColor: '#F59E0B',
      accentText: '#FEF3C7'
    };
  }
  return {
    bgGradientStart: '#FFF8E7',
    bgGradientEnd: '#FFEFD5',
    cardBg: 'white',
    borderColor: 'rgba(217, 119, 6, 0.2)',
    primaryText: '#78350F',
    secondaryText: '#92400E',
    accentBg: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
    accentColor: '#F59E0B',
    accentText: '#78350F'
  };
};

/**
 * 创建SVG图标
 */
const createCoffeeIcon = () => {
  const svg = `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
      <path d="M17 10H19C20.1046 10 21 10.8954 21 12V13C21 14.1046 20.1046 15 19 15H17M17 10V8C17 6.89543 16.1046 6 15 6H5C3.89543 6 3 6.89543 3 8V15C3 17.2091 4.79086 19 7 19H13C15.2091 19 17 17.2091 17 15V10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M7 3V6M11 3V6M15 3V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
  return svg;
};

/**
 * 创建二维码（简化版，显示文字提示）
 */
const createQRPlaceholder = (url, themeColors) => {
  return `
    <div style="
      width: 100px;
      height: 100px;
      background: ${themeColors.cardBg};
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: ${themeColors.accentText};
      text-align: center;
      padding: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 2px solid ${themeColors.accentColor};
      line-height: 1.3;
    ">
      <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">扫码访问</div>
      <div style="font-size: 9px; color: ${themeColors.secondaryText}; word-break: break-all;">${url.replace('https://', '')}</div>
    </div>
  `;
};

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
    timestamp = new Date().toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    })
  } = options;

  const isDark = isDarkMode();
  const themeColors = getThemeColors(isDark);

  // 克隆原始内容并清理
  const contentClone = element.cloneNode(true);
  
  // 移除所有按钮和交互元素
  const buttonsToRemove = contentClone.querySelectorAll('button, .absolute.right-0.top-full, [role="button"]');
  buttonsToRemove.forEach(btn => {
    btn.remove();
  });

  // 获取内容尺寸
  const contentWidth = Math.max(element.offsetWidth, 400);
  const containerWidth = Math.min(contentWidth + 80, 900);

  // 创建容器
  const container = document.createElement('div');
  container.style.cssText = `
    background: linear-gradient(135deg, ${themeColors.bgGradientStart} 0%, ${themeColors.bgGradientEnd} 100%);
    padding: 32px 40px;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, ${isDark ? '0.5' : '0.15'});
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
    width: ${containerWidth}px;
    box-sizing: border-box;
  `;

  // 顶部 Logo 和标题栏
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid ${themeColors.borderColor};
  `;

  // Logo 和应用名称
  const logoSection = document.createElement('div');
  logoSection.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
  `;

  const logoIcon = document.createElement('div');
  logoIcon.style.cssText = `
    width: 48px;
    height: 48px;
    background: ${themeColors.accentBg};
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);
    padding: 8px;
  `;
  logoIcon.innerHTML = createCoffeeIcon();

  const titleSection = document.createElement('div');
  const appTitle = document.createElement('div');
  appTitle.style.cssText = `
    font-size: 22px;
    font-weight: 700;
    color: ${themeColors.primaryText};
    margin-bottom: 2px;
    line-height: 1.2;
  `;
  appTitle.textContent = title;

  const appSubtitle = document.createElement('div');
  appSubtitle.style.cssText = `
    font-size: 12px;
    color: ${themeColors.secondaryText};
    line-height: 1.3;
  `;
  appSubtitle.textContent = description;

  titleSection.appendChild(appTitle);
  titleSection.appendChild(appSubtitle);
  logoSection.appendChild(logoIcon);
  logoSection.appendChild(titleSection);

  // 二维码区域
  const qrSection = document.createElement('div');
  qrSection.innerHTML = createQRPlaceholder(url, themeColors);

  header.appendChild(logoSection);
  header.appendChild(qrSection);

  // 内容区域
  const content = document.createElement('div');
  content.style.cssText = `
    background: ${themeColors.cardBg};
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, ${isDark ? '0.3' : '0.08'});
  `;
  content.appendChild(contentClone);

  // 底部信息栏
  const footer = document.createElement('div');
  footer.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 2px solid ${themeColors.borderColor};
    color: ${themeColors.secondaryText};
    font-size: 12px;
  `;

  const footerLeft = document.createElement('div');
  footerLeft.style.cssText = 'line-height: 1.5;';
  footerLeft.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 2px; color: ${themeColors.primaryText};">${title}</div>
    <div style="font-size: 11px; color: ${themeColors.secondaryText};">科学管理咖啡因摄入，守护您的健康生活</div>
  `;

  const footerRight = document.createElement('div');
  footerRight.style.cssText = 'text-align: right; line-height: 1.5;';
  footerRight.innerHTML = `
    <div style="font-weight: 600; color: ${themeColors.accentColor}; margin-bottom: 2px;">${url}</div>
    <div style="font-size: 11px; color: ${themeColors.secondaryText};">生成时间: ${timestamp}</div>
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

  // 创建临时容器 - 使用 opacity 而不是 visibility
  const tempContainer = document.createElement('div');
  tempContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9999;
    opacity: 0;
    pointer-events: none;
  `;
  document.body.appendChild(tempContainer);

  try {
    // 创建社交卡片
    const socialCard = createSocialCard(element, options.cardOptions || {});
    tempContainer.appendChild(socialCard);

    // 等待DOM渲染和样式应用
    await new Promise(resolve => setTimeout(resolve, 200));

    const defaultOptions = {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      windowWidth: socialCard.offsetWidth || 800,
      windowHeight: socialCard.offsetHeight || 600,
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
    if (tempContainer.parentNode) {
      document.body.removeChild(tempContainer);
    }
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
