import React, { useState } from 'react';
import {
  Info, User, Globe, Coffee, AlertTriangle,
  BookOpen, Brain, HeartPulse, ExternalLink, Mail, Github, Sparkle, DownloadCloud, RefreshCcw as RefreshIcon,
  Share as ShareIcon, Copy, Check, MessageCircle, Bug, Home, Smartphone
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import MathFormula from '../components/MathFormula';
import { generateFeedbackMailto } from '../utils/feedbackUtils';
import { trackEvent } from '../utils/analytics';


/**
 * 关于页面视图组件
 * 显示关于应用的信息，包括作者、数据来源和科学依据
 */
const AboutView = ({
  colors,
  appConfig,
  isNativePlatform,
  canInstallPwa = false,
  isStandalonePwa = false,
  browserPlatform = { isAndroid: false, isIOS: false },
  onInstallPwa
}) => {
  const [updateCheckStatus, setUpdateCheckStatus] = useState('');
  const [checkingForUpdate, setCheckingForUpdate] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCheckForUpdate = async () => {
    if (!isNativePlatform) return;
    setCheckingForUpdate(true);
    setUpdateCheckStatus('正在检查更新...');
    try {
      const response = await fetch('https://ct.jerryz.com.cn/version.json?_=' + new Date().getTime());
      if (!response.ok) {
        throw new Error(`检查更新失败: ${response.status}`);
      }
      const remoteConfig = await response.json();

      // 简单的版本比较，复杂版本字符串可能需要更强健的比较
      if (remoteConfig.latest_version && remoteConfig.latest_version > appConfig.latest_version) {
        if (window.confirm(`发现新版本 ${remoteConfig.latest_version}！当前版本 ${appConfig.latest_version}。是否前往下载页面？`)) {
          window.open(remoteConfig.download_url || appConfig.download_url, '_blank');
          trackEvent('android_download', { source: 'about_update_check' });
          setUpdateCheckStatus(`有新版本: ${remoteConfig.latest_version}。正在打开下载链接...`);
        } else {
          setUpdateCheckStatus(`有新版本: ${remoteConfig.latest_version}。用户取消下载。`);
        }
      } else {
        setUpdateCheckStatus('当前已是最新版本。');
      }
    } catch (error) {
      console.error('检查更新出错:', error);
      setUpdateCheckStatus(`检查更新失败: ${error.message}`);
    } finally {
      setCheckingForUpdate(false);
    }
  };

  const handleShareApp = async () => {
    const shareData = {
      title: '咖啡因追踪器 - 科学管理您的咖啡因摄入',
      text: '推荐这款咖啡因追踪器！它可以帮助科学管理咖啡因摄入量，提供代谢预测和健康建议。',
      url: 'https://ct.jerryz.com.cn',
      dialogTitle: '分享咖啡因追踪器'
    };

    try {
      if (isNativePlatform) {
        // 在原生平台使用 Capacitor Share API
        await Share.share(shareData);
        trackEvent('share', { target: 'app', method: 'native' });
      } else {
        // 在网页平台尝试使用 Web Share API
        if (navigator.share) {
          await navigator.share(shareData);
          trackEvent('share', { target: 'app', method: 'web_share' });
        } else {
          // 如果 Web Share API 不可用，直接复制链接
          await navigator.clipboard.writeText(shareData.url);
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 2000);
          trackEvent('share', { target: 'app', method: 'copy' });
        }
      }
    } catch (error) {
      console.error('分享失败:', error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText('https://ct.jerryz.com.cn');
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      trackEvent('share', { target: 'app', method: 'copy' });
    } catch (error) {
      console.error('复制链接失败:', error);
    }
  };

  const handleFeedback = () => {
    const mailtoLink = generateFeedbackMailto('feedback', appConfig, isNativePlatform);
    window.open(mailtoLink);
  };

  const handleSuggestion = () => {
    const mailtoLink = generateFeedbackMailto('suggestion', appConfig, isNativePlatform);
    window.open(mailtoLink);
  };

  const showPwaAccess = !isNativePlatform && !browserPlatform.isAndroid;
  const pwaInstruction = browserPlatform.isIOS
    ? 'Safari 中点分享按钮，再选“添加到主屏幕”。'
    : '浏览器菜单或地址栏中选择“安装应用”。';

  return (
    <div className="columns-1 sm:columns-2 xl:columns-3 gap-3 sm:gap-4 w-full">
      {/* 关于应用卡片 - 调整到前面 */}
      <section
        aria-labelledby="about-app-heading"
        className="max-w-md w-full mb-3 sm:mb-4 rounded-xl p-5 sm:p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="about-app-heading"
          className="text-lg sm:text-xl font-semibold mb-3 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <Info size={20} className="mr-2" /> 关于咖啡因追踪器
        </h2>

        <div className="space-y-3 text-sm transition-colors" style={{ color: colors.textSecondary }}>
          <p className="leading-6">
            这是一款专注于咖啡因摄入管理的科学工具，帮助您了解和优化日常咖啡因摄入习惯，
            避免过量摄入对健康和睡眠造成不良影响。
          </p>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg flex items-start gap-2 transition-colors" style={{ backgroundColor: colors.bgBase }}>
              <Coffee size={18} className="mt-0.5 flex-shrink-0" style={{ color: colors.accent }} />
              <div>
                <h3 className="font-medium sm:mb-1 transition-colors" style={{ color: colors.espresso }}>智能记录</h3>
                <p className="text-xs mt-0.5 sm:mt-0">记录摄入趋势<span className="hidden sm:inline">，可视化图表展示摄入变化</span></p>
              </div>
            </div>

            <div className="p-2 sm:p-3 rounded-lg flex items-start gap-2 transition-colors" style={{ backgroundColor: colors.bgBase }}>
              <HeartPulse size={18} className="mt-0.5 flex-shrink-0" style={{ color: colors.accent }} />
              <div>
                <h3 className="font-medium sm:mb-1 transition-colors" style={{ color: colors.espresso }}>健康建议</h3>
                <p className="text-xs mt-0.5 sm:mt-0">辅助睡眠安排<span className="hidden sm:inline">，提供个性化健康建议</span></p>
              </div>
            </div>

            <div className="p-2 sm:p-3 rounded-lg flex items-start gap-2 transition-colors" style={{ backgroundColor: colors.bgBase }}>
              <Brain size={18} className="mt-0.5 flex-shrink-0" style={{ color: colors.accent }} />
              <div>
                <h3 className="font-medium sm:mb-1 transition-colors" style={{ color: colors.espresso }}>科学计算</h3>
                <p className="text-xs mt-0.5 sm:mt-0">估算代谢曲线<span className="hidden sm:inline">，展示体内咖啡因水平变化</span></p>
              </div>
            </div>

            <div className="p-2 sm:p-3 rounded-lg flex items-start gap-2 transition-colors" style={{ backgroundColor: colors.bgBase }}>
              <Sparkle size={18} className="mt-0.5 flex-shrink-0" style={{ color: colors.accent }} />
              <div>
                <h3 className="font-medium sm:mb-1 transition-colors" style={{ color: colors.espresso }}>持续优化</h3>
                <p className="text-xs mt-0.5 sm:mt-0">按反馈迭代<span className="hidden sm:inline">，追求更好的使用体验</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="app-access-heading"
        className="max-w-md w-full mb-3 sm:mb-4 rounded-xl p-5 sm:p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="app-access-heading"
          className="text-lg sm:text-xl font-semibold mb-3 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <ExternalLink size={20} className="mr-2" /> 获取应用
        </h2>

        <div className="space-y-3 text-sm transition-colors" style={{ color: colors.textSecondary }}>
          <div
            className="rounded-lg border overflow-hidden sm:grid sm:grid-cols-2 sm:gap-4 sm:border-0 sm:overflow-visible sm:rounded-none"
            style={{ borderColor: colors.borderSubtle }}
          >
            <a
              href="https://ct.jerryz.com.cn"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 transition-colors hover:opacity-90 sm:flex-col sm:justify-center sm:p-5 sm:rounded-lg sm:border sm:text-center"
              style={{
                backgroundColor: colors.bgBase,
                borderColor: colors.borderSubtle
              }}
            >
              <Globe size={22} className="flex-shrink-0" style={{ color: colors.accent }} />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold transition-colors" style={{ color: colors.espresso }}>网页版</h3>
                <p className="text-xs mt-0.5 sm:mt-2 sm:whitespace-normal truncate">无需安装，直接打开 ct.jerryz.com.cn</p>
              </div>
              <ExternalLink size={16} className="flex-shrink-0 sm:hidden" style={{ color: colors.textMuted }} />
            </a>

            {showPwaAccess && (
              <div
                className="flex items-center gap-3 p-3 border-t sm:flex-col sm:justify-center sm:p-5 sm:rounded-lg sm:border sm:text-center"
                style={{ backgroundColor: colors.bgBase, borderColor: colors.borderSubtle }}
              >
                <Home size={22} className="flex-shrink-0" style={{ color: colors.accent }} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold transition-colors" style={{ color: colors.espresso }}>
                    PWA 桌面应用
                  </h3>
                  <p className="text-xs mt-0.5 sm:mt-2">
                    {isStandalonePwa ? '已以应用模式打开。' : pwaInstruction}
                  </p>
                </div>
                {canInstallPwa && !isStandalonePwa ? (
                  <button
                    type="button"
                    onClick={onInstallPwa}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: colors.accent }}
                  >
                    安装
                  </button>
                ) : (
                  <span
                    className="px-2.5 py-1 rounded-full text-xs flex-shrink-0"
                    style={{ backgroundColor: colors.bgHighlight, color: colors.accent }}
                  >
                    {isStandalonePwa ? '已安装' : '可添加'}
                  </span>
                )}
              </div>
            )}

            <a
              href={appConfig.download_url}
              target="_blank"
              rel="noopener noreferrer"
              data-analytics-source="about_app_access"
              className="flex items-center gap-3 p-3 border-t transition-colors hover:opacity-90 sm:flex-col sm:justify-center sm:p-5 sm:rounded-lg sm:border sm:text-center"
              style={{
                backgroundColor: colors.bgBase,
                borderColor: colors.borderSubtle
              }}
            >
              <Smartphone size={22} className="flex-shrink-0" style={{ color: colors.accent }} />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold transition-colors" style={{ color: colors.espresso }}>
                  Android 客户端 v{appConfig.latest_version}
                </h3>
                <p className="text-xs mt-0.5 sm:mt-2">离线可用，WebDAV 同步更少受浏览器限制</p>
              </div>
              <span className="px-3 py-1.5 rounded-md text-xs font-medium text-white flex items-center flex-shrink-0" style={{ backgroundColor: colors.accent }}>
                <DownloadCloud size={13} className="mr-1" /> 下载
              </span>
            </a>
          </div>

          {isNativePlatform && (
            <div className="mt-6 text-center">
              <button
                onClick={handleCheckForUpdate}
                disabled={checkingForUpdate}
                className="py-2.5 px-5 text-white rounded-md transition-opacity duration-200 flex items-center justify-center text-sm shadow font-medium mx-auto disabled:opacity-60 hover:opacity-90"
                style={{ backgroundColor: colors.accent }}
              >
                <RefreshIcon size={16} className={`mr-1.5 ${checkingForUpdate ? 'animate-spin' : ''}`} />
                {checkingForUpdate ? '检查中...' : '检查应用更新'}
              </button>
              {updateCheckStatus && (
                <p className="text-xs mt-2 transition-colors" style={{ color: colors.textMuted }}>
                  {updateCheckStatus}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 分享推荐卡片 */}
      <section
        aria-labelledby="share-heading"
        className="max-w-md w-full mb-3 sm:mb-4 rounded-xl p-5 sm:p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="share-heading"
          className="text-lg sm:text-xl font-semibold mb-3 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <ShareIcon size={20} className="mr-2" /> 分享推荐
        </h2>

        <div className="space-y-3 text-sm transition-colors" style={{ color: colors.textSecondary }}>
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }}
          >
            <div className="flex items-center gap-3 p-3">
              <div className="p-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors.bgHighlight }}>
                <ShareIcon size={20} style={{ color: colors.accent }} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium transition-colors" style={{ color: colors.espresso }}>推荐给朋友</h3>
                <p className="text-xs mt-0.5">分享链接或复制应用地址</p>
              </div>
              <button
                onClick={handleShareApp}
                className="py-2 px-3 text-white rounded-md transition-opacity duration-200 flex items-center justify-center text-xs shadow font-medium hover:opacity-90 flex-shrink-0"
                style={{ backgroundColor: colors.accent }}
              >
                <ShareIcon size={14} className="mr-1" />
                {isNativePlatform ? '立即分享' : (navigator.share ? '立即分享' : '复制链接')}
              </button>
            </div>

            <div className="border-t p-3 flex items-center justify-between gap-2" style={{ borderColor: colors.borderSubtle }}>
              <span className="font-medium text-xs px-2.5 py-1 rounded-md truncate" style={{ backgroundColor: colors.bgHighlight, color: colors.textPrimary }}>
                ct.jerryz.com.cn
              </span>
              <button
                onClick={handleCopyLink}
                className="py-1.5 px-3 rounded-md transition-all duration-200 flex items-center text-xs border flex-shrink-0"
                style={{
                  backgroundColor: linkCopied ? colors.successBg : 'transparent',
                  borderColor: linkCopied ? colors.successText : colors.borderSubtle,
                  color: linkCopied ? colors.successText : colors.textSecondary
                }}
              >
                {linkCopied ? (
                  <>
                    <Check size={14} className="mr-1.5" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy size={14} className="mr-1.5" />
                    复制链接
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 问题反馈卡片 */}
      <section
        aria-labelledby="feedback-heading"
        className="max-w-md w-full mb-3 sm:mb-4 rounded-xl p-5 sm:p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="feedback-heading"
          className="text-lg sm:text-xl font-semibold mb-3 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <MessageCircle size={20} className="mr-2" /> 反馈与建议
        </h2>

        <div className="space-y-3 text-sm transition-colors" style={{ color: colors.textSecondary }}>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: colors.borderSubtle }}>
            <button
              onClick={handleFeedback}
              className="w-full flex items-center gap-3 p-3 text-left hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colors.bgBase }}
            >
              <Bug size={20} className="flex-shrink-0" style={{ color: colors.accent }} />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold transition-colors" style={{ color: colors.espresso }}>问题报告</h3>
                <p className="text-xs mt-0.5">自动带上设备和版本信息</p>
              </div>
              <Mail size={16} className="flex-shrink-0" style={{ color: colors.textMuted }} />
            </button>

            <button
              onClick={handleSuggestion}
              className="w-full flex items-center gap-3 p-3 text-left border-t hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colors.bgBase, borderColor: colors.borderSubtle }}
            >
              <Sparkle size={20} className="flex-shrink-0" style={{ color: colors.accent }} />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold transition-colors" style={{ color: colors.espresso }}>功能建议</h3>
                <p className="text-xs mt-0.5">告诉我你希望它怎么变好</p>
              </div>
              <Mail size={16} className="flex-shrink-0" style={{ color: colors.textMuted }} />
            </button>
          </div>

          <a
            href="mailto:i@jerryz.com.cn"
            className="flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors text-xs"
            style={{ borderColor: colors.borderSubtle, backgroundColor: colors.bgBase, color: colors.textSecondary }}
          >
            <span className="flex items-center min-w-0">
              <Mail size={16} className="mr-2 flex-shrink-0" style={{ color: colors.accent }} />
              <span className="truncate">i@jerryz.com.cn</span>
            </span>
            <ExternalLink size={14} className="flex-shrink-0" />
          </a>
        </div>
      </section>

      {/* 开发者信息卡片 - 移到后面 */}
      <section
        aria-labelledby="developer-info-heading"
        className="max-w-md w-full mb-3 sm:mb-4 rounded-xl p-5 sm:p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="developer-info-heading"
          className="text-lg sm:text-xl font-semibold mb-3 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <User size={20} className="mr-2" /> 关于开发者
        </h2>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* 开发者头像 */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 shadow-md flex-shrink-0" style={{ borderColor: colors.accent }}>
            <img
              src="https://cdn.jerryz.com.cn/gh/YangguangZhou/picx-images-hosting@master/Qexo/avatar.jpg"
              alt="Jerry Zhou"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* 开发者信息 */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold mb-2 transition-colors" style={{ color: colors.espresso }}>
              Jerry Zhou
            </h3>

            <div className="flex flex-wrap gap-2 text-xs">
              <a
                href="https://jerryz.com.cn"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-colors"
                style={{
                  backgroundColor: colors.bgBase,
                  color: colors.accent,
                  border: `1px solid ${colors.borderSubtle}`
                }}
              >
                <Globe size={14} /> 个人网站
              </a>

              <a
                href="mailto:i@jerryz.com.cn"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-colors"
                style={{
                  backgroundColor: colors.bgBase,
                  color: colors.accent,
                  border: `1px solid ${colors.borderSubtle}`
                }}
              >
                <Mail size={14} /> 联系我
              </a>

              <a
                href="https://github.com/YangguangZhou"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-colors"
                style={{
                  backgroundColor: colors.bgBase,
                  color: colors.accent,
                  border: `1px solid ${colors.borderSubtle}`
                }}
              >
                <Github size={14} /> GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 计算与科学依据卡片 */}
      <section
        aria-labelledby="science-basis-heading"
        className="max-w-md w-full mb-3 sm:mb-4 rounded-xl p-5 sm:p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="science-basis-heading"
          className="text-lg sm:text-xl font-semibold mb-3 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <Coffee size={20} className="mr-2" /> 计算与科学依据
        </h2>

        <div className="space-y-3 sm:space-y-4 text-sm transition-colors" style={{ color: colors.textSecondary }}>
          {/* 预设数据提醒 */}
          <div
            className="p-3 sm:p-4 rounded-lg border"
            style={{
              backgroundColor: colors.warningBg,
              color: colors.warningText,
              borderColor: colors.warningText,
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            <h3 className="font-semibold mb-2 flex items-center">
              <AlertTriangle size={16} className="mr-1.5" /> 预设数据说明
            </h3>
            <p>
              应用内预设饮品的咖啡因含量基于公开数据整理，<strong>可能与实际含量存在差异</strong>。
              不同品牌、制作方式、杯型规格都会影响实际含量。
            </p>
            <p className="mt-2">
              <strong>建议您根据产品标签或实际情况，在"设置"中编辑预设值或添加自定义饮品。</strong>
            </p>
          </div>

          {/* 计算模型说明 */}
          <div
            className="p-3 sm:p-4 rounded-lg border"
            style={{
              backgroundColor: colors.warningBg,
              color: colors.warningText,
              borderColor: colors.warningText,
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            <h3 className="font-semibold mb-2 flex items-center">
              <AlertTriangle size={16} className="mr-1.5" /> 计算模型局限性
            </h3>
            <div className="space-y-2">
              <p>
                <strong>代谢模型：</strong>使用一级消除动力学 <MathFormula formula="C(t) = C_0 \times 0.5^{t/t_{1/2}}" />
                估算体内咖啡因残留，这是简化的通用模型。
              </p>
              <p>
                <strong>个体差异：</strong>实际代谢受多种因素影响，包括：
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-xs">
                <li><strong>遗传基因：</strong>CYP1A2酶活性差异显著</li>
                <li><strong>生理状态：</strong>肝功能、年龄、怀孕等</li>
                <li><strong>生活习惯：</strong>吸烟会加速代谢</li>
                <li><strong>药物交互：</strong>避孕药、抗生素等影响代谢速度</li>
              </ul>
              <p className="mt-2">
                <strong>睡眠建议：</strong>基于估算浓度和阈值计算，仅供参考。个体敏感度差异很大。
              </p>
            </div>
          </div>

          {/* 个性化调整建议 */}
          <div
            className="p-3 sm:p-4 rounded-lg border"
            style={{
              backgroundColor: colors.successBg,
              color: colors.successText,
              borderColor: colors.successText,
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            <h3 className="font-semibold mb-2 flex items-center">
              <BookOpen size={16} className="mr-1.5" /> 个性化调整建议
            </h3>
            <p className="mb-2">
              <strong>建议结合个人感受，在"设置"中调整关键参数：</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>半衰期：</strong>如果咖啡因影响时间较长（如下午喝晚上睡不着），可增加半衰期；
                反之则减少
              </li>
              <li>
                <strong>安全阈值：</strong>对咖啡因敏感者可降低睡前安全浓度阈值；
                不敏感者可适当提高
              </li>
            </ul>
            <p className="mt-2 text-xs">
              <strong>注意：</strong>个性化调整能提高估算准确性，但仍然只是估算值，请结合实际感受使用。
            </p>
          </div>
        </div>
      </section>

      {/* 免责声明卡片 */}
      <section
        aria-labelledby="disclaimer-heading"
        className="max-w-md w-full mb-3 sm:mb-4 rounded-xl p-5 sm:p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="disclaimer-heading"
          className="text-lg sm:text-xl font-semibold mb-3 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <AlertTriangle size={20} className="mr-2" /> 免责声明
        </h2>

        <div className="text-sm transition-colors" style={{ color: colors.textSecondary }}>
          <p>
            本应用提供的数据和建议仅供参考，不能替代专业医疗建议。计算基于简化模型，
            实际个体代谢可能存在较大差异。
          </p>
          <p className="mt-2">
            如有健康问题或特殊情况，请咨询医疗专业人士。预设饮品数据来源于公开资料，
            可能与实际含量有差异，建议根据实际情况调整。
          </p>
        </div>
      </section>
    </div>
  );
};

export default AboutView;
