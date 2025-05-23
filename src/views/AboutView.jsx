import React, { useState, useEffect } from 'react';
import {
  Info, User, Globe, Coffee, AlertTriangle,
  BookOpen, Brain, HeartPulse, ExternalLink, Mail, Github, Sparkle, DownloadCloud, RefreshCcw as RefreshIcon,
  Share as ShareIcon, Copy, Check
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Share } from '@capacitor/share'; // 导入 Share API


/**
 * 关于页面视图组件
 * 显示关于应用的信息，包括作者、数据来源和科学依据
 */
const AboutView = ({ colors, appConfig, isNativePlatform }) => {
  const [updateCheckStatus, setUpdateCheckStatus] = useState('');
  const [checkingForUpdate, setCheckingForUpdate] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCheckForUpdate = async () => {
    if (!isNativePlatform) return;
    setCheckingForUpdate(true);
    setUpdateCheckStatus('正在检查更新...');
    try {
      const response = await fetch('https://ct.jerryz.com.cn/version.json?_=' + new Date().getTime()); // Cache buster
      if (!response.ok) {
        throw new Error(`检查更新失败: ${response.status}`);
      }
      const remoteConfig = await response.json();
      
      // Simple version comparison
      // More robust comparison might be needed for complex version strings
      if (remoteConfig.latest_version && remoteConfig.latest_version > appConfig.latest_version) {
        if (window.confirm(`发现新版本 ${remoteConfig.latest_version}！当前版本 ${appConfig.latest_version}。是否前往下载页面？`)) {
          await Browser.open({ url: remoteConfig.download_url || appConfig.download_url });
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
      } else {
        // 在网页平台尝试使用 Web Share API
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          // 如果 Web Share API 不可用，直接复制链接
          navigator.clipboard.writeText(shareData.url);
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 2000);
        }
      }
    } catch (error) {
      console.error('分享失败:', error);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://ct.jerryz.com.cn');
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <>

      {/* 开发者信息卡片 */}
      <section
        aria-labelledby="developer-info-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="developer-info-heading"
          className="text-xl font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <User size={20} className="mr-2" aria-hidden="true" /> 关于开发者
        </h2>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* 开发者头像 */}
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 shadow-md" style={{ borderColor: colors.accent }}>
            <img
              src="https://cdn.jerryz.com.cn/gh/YangguangZhou/picx-images-hosting@master/Qexo/avatar.jpg"
              alt="Jerry Zhou"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* 开发者信息 */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-semibold mb-1 transition-colors" style={{ color: colors.espresso }}>
              Jerry Zhou
            </h3>
            
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-sm">
              <a
                href="https://jerryz.com.cn"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors"
                style={{ 
                  backgroundColor: colors.bgBase,
                  color: colors.accent,
                  border: `1px solid ${colors.borderSubtle}`
                }}
              >
                <Globe size={14} aria-hidden="true" /> 个人网站
              </a>
              
              <a
                href="mailto:i@jerryz.com.cn"
                className="flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors"
                style={{ 
                  backgroundColor: colors.bgBase,
                  color: colors.accent,
                  border: `1px solid ${colors.borderSubtle}`
                }}
              >
                <Mail size={14} aria-hidden="true" /> 联系我
              </a>
              
              <a
                href="https://github.com/YangguangZhou"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors"
                style={{ 
                  backgroundColor: colors.bgBase,
                  color: colors.accent,
                  border: `1px solid ${colors.borderSubtle}`
                }}
              >
                <Github size={14} aria-hidden="true" /> GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="app-access-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="app-access-heading"
          className="text-xl font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <ExternalLink size={20} className="mr-2" aria-hidden="true" /> 应用获取方式
        </h2>

        <div className="space-y-4 text-sm transition-colors" style={{ color: colors.textSecondary }}>
          <p>
            咖啡因追踪器提供网页版和Android客户端两种使用方式，选择最适合您的方式开始科学管理咖啡因摄入：
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <a 
              href="https://ct.jerryz.com.cn" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-5 rounded-lg border hover:shadow-md transition-all duration-300"
              style={{ 
                borderColor: colors.borderSubtle,
                backgroundColor: colors.bgBase
              }}
            >
              <Globe 
                size={36} 
                className="mb-3" 
                style={{ color: colors.accent }} 
                aria-hidden="true" 
              />
              <h3 className="font-semibold mb-2 transition-colors" style={{ color: colors.espresso }}>
                网页版应用
              </h3>
              <p className="text-center">
                无需安装，随时访问<br />
                <span className="font-medium inline-block mt-1 px-3 py-1 rounded-full" style={{ backgroundColor: colors.bgHighlight, color: colors.accent }}>
                  ct.jerryz.com.cn
                </span>
              </p>
            </a>
            
            <a 
              href={appConfig.download_url} // Use dynamic download URL
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-5 rounded-lg border hover:shadow-md transition-all duration-300"
              style={{ 
                borderColor: colors.borderSubtle,
                backgroundColor: colors.bgBase
              }}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="36" 
                height="36" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="mb-3" 
                style={{ color: colors.accent }} 
                aria-hidden="true"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <path d="M12 18h.01" />
              </svg>
              <h3 className="font-semibold mb-2 transition-colors text-center" style={{ color: colors.espresso }}>
                Android 客户端 v{appConfig.latest_version}
              </h3>
              <p className="text-center">
                无需等待，点击即开<br />
                <span className="font-medium inline-block mt-1 px-3 py-1 rounded-full" style={{ backgroundColor: colors.bgHighlight, color: colors.accent }}>
                  <DownloadCloud size={14} className="inline mr-1" /> 下载链接
                </span>
              </p>
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
                <RefreshIcon size={16} className={`mr-1.5 ${checkingForUpdate ? 'animate-spin' : ''}`} aria-hidden="true" />
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

      {/* 分享推荐卡片 - 新增部分 */}
      <section
        aria-labelledby="share-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="share-heading"
          className="text-xl font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <ShareIcon size={20} className="mr-2" aria-hidden="true" /> 分享推荐
        </h2>

        <div className="space-y-4 text-sm transition-colors" style={{ color: colors.textSecondary }}>
          <p>
            如果您觉得咖啡因追踪器对您有所帮助，请将它推荐给可能需要科学管理咖啡因摄入的朋友们！
            通过分享，您可以帮助更多人养成健康的咖啡因摄入习惯。
          </p>
          
          <div className="flex flex-col items-center justify-center p-5 rounded-lg border transition-colors"
            style={{ borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }}>
            
            <div className="w-full max-w-md flex flex-col sm:flex-row items-center sm:justify-between gap-4">
              <div className="flex items-center">
                <div className="mr-3 p-2 rounded-full" style={{ backgroundColor: colors.bgHighlight }}>
                  <ShareIcon size={24} style={{ color: colors.accent }} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-medium transition-colors" style={{ color: colors.espresso }}>一键分享</h3>
                  <p className="text-xs">分享给您的朋友和社交圈</p>
                </div>
              </div>
              
              <button
                onClick={handleShareApp}
                className="py-2.5 px-4 text-white rounded-md transition-opacity duration-200 flex items-center justify-center text-sm shadow font-medium hover:opacity-90 w-full sm:w-auto"
                style={{ backgroundColor: colors.accent }}
              >
                <ShareIcon size={16} className="mr-1.5" aria-hidden="true" />
                {isNativePlatform ? '立即分享' : (navigator.share ? '立即分享' : '复制链接')}
              </button>
            </div>
            
            <div className="w-full border-t mt-5 pt-5" style={{ borderColor: colors.borderSubtle }}>
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
                <div className="flex items-center">
                  <p className="text-xs sm:mr-2">应用网址:</p>
                  <span className="font-medium text-sm px-3 py-1.5 rounded-md" style={{ backgroundColor: colors.bgHighlight, color: colors.textPrimary }}>
                    ct.jerryz.com.cn
                  </span>
                </div>
                
                <button
                  onClick={handleCopyLink}
                  className="py-1.5 px-3 rounded-md transition-all duration-200 flex items-center text-xs border"
                  style={{ 
                    backgroundColor: linkCopied ? colors.successBg : 'transparent',
                    borderColor: linkCopied ? colors.successText : colors.borderSubtle,
                    color: linkCopied ? colors.successText : colors.textSecondary
                  }}
                >
                  {linkCopied ? (
                    <>
                      <Check size={14} className="mr-1.5" aria-hidden="true" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy size={14} className="mr-1.5" aria-hidden="true" />
                      复制链接
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 关于应用卡片 */}
      <section
        aria-labelledby="about-app-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="about-app-heading"
          className="text-xl font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <Info size={20} className="mr-2" aria-hidden="true" /> 关于咖啡因追踪器
        </h2>

        <div className="space-y-4 text-sm transition-colors" style={{ color: colors.textSecondary }}>
          <p>
            咖啡因追踪器是一款基于科学原理开发的Web应用，旨在帮助用户科学地管理每日咖啡因摄入量，提供代谢预测、健康建议和睡眠时间优化。
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg flex items-start gap-2 transition-colors" style={{ backgroundColor: colors.bgBase }}>
              <Sparkle size={18} className="mt-0.5 flex-shrink-0" style={{ color: colors.accent }} aria-hidden="true" />
              <div>
                <h3 className="font-medium mb-1 transition-colors" style={{ color: colors.espresso }}>应用特性</h3>
                <p>简单易用，功能丰富，提供可视化的数据显示。</p>
              </div>
            </div>
            
            <div className="p-3 rounded-lg flex items-start gap-2 transition-colors" style={{ backgroundColor: colors.bgBase }}>
              <Coffee size={18} className="mt-0.5 flex-shrink-0" style={{ color: colors.accent }} aria-hidden="true" />
              <div>
                <h3 className="font-medium mb-1 transition-colors" style={{ color: colors.espresso }}>应用初衷</h3>
                <p>帮助咖啡爱好者更科学地管理咖啡因摄入，避免过量摄入影响健康和睡眠</p>
              </div>
            </div>
            
            <div className="p-3 rounded-lg flex items-start gap-2 transition-colors" style={{ backgroundColor: colors.bgBase }}>
              <HeartPulse size={18} className="mt-0.5 flex-shrink-0" style={{ color: colors.accent }} aria-hidden="true" />
              <div>
                <h3 className="font-medium mb-1 transition-colors" style={{ color: colors.espresso }}>健康导向</h3>
                <p>基于科学研究提供个性化建议，促进健康的咖啡因摄入习惯</p>
              </div>
            </div>
            
            <div className="p-3 rounded-lg flex items-start gap-2 transition-colors" style={{ backgroundColor: colors.bgBase }}>
              <Brain size={18} className="mt-0.5 flex-shrink-0" style={{ color: colors.accent }} aria-hidden="true" />
              <div>
                <h3 className="font-medium mb-1 transition-colors" style={{ color: colors.espresso }}>持续改进</h3>
                <p>欢迎用户反馈，不断完善功能和科学模型的准确性</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 计算与科学依据卡片 */}
      <section
        aria-labelledby="science-basis-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="science-basis-heading"
          className="text-xl font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <Coffee size={20} className="mr-2" aria-hidden="true" /> 计算与科学依据
        </h2>

        <div className="space-y-5 text-sm transition-colors" style={{ color: colors.textSecondary }}>
          {/* 预设数据提醒 */}
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: colors.warningBg,
              color: colors.warningText,
              borderColor: colors.warningText, // Use themed border color
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            <h3 className="font-semibold mb-2 flex items-center">
              <AlertTriangle size={16} className="mr-1.5" aria-hidden="true" /> 预设数据提醒
            </h3>
            <p>
              应用内预设饮品的咖啡因含量是基于公开数据整理或估算得出，<strong>可能与实际含量存在差异</strong>。不同品牌、不同杯型、不同制作方式甚至不同批次都可能影响实际含量。例如，一杯手冲咖啡的咖啡因含量可能远高于一杯速溶咖啡。
            </p>
            <p className="mt-2">
              <strong>强烈建议您根据实际情况、产品标签或官方数据，在"设置"中编辑预设值或添加自定义饮品，以获得更准确的追踪结果。</strong>
            </p>
          </div>

          {/* 计算模型局限性 */}
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: colors.warningBg,
              color: colors.warningText,
              borderColor: colors.warningText, // Use themed border color
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            <h3 className="font-semibold mb-2 flex items-center">
              <AlertTriangle size={16} className="mr-1.5" aria-hidden="true" /> 计算模型局限性
            </h3>
            <ul className="list-disc list-inside space-y-3">
              <li>
                <strong>咖啡因代谢:</strong> 本应用使用基于半衰期的一级消除动力学模型 (<code>M(t) = M0 * (0.5)^(t / t_half)</code>) 来估算剩余咖啡因量。这是一个<strong>简化的通用模型</strong>，假设代谢速率恒定。
              </li>
              <li>
                <strong>个体差异巨大:</strong> 实际的咖啡因代谢速率受多种复杂因素影响，包括但不限于：
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li><strong>遗传基因:</strong> <code>CYP1A2</code> 酶的活性对咖啡因代谢速率有显著的影响。</li>
                  <li><strong>肝脏健康状况:</strong> 肝功能会直接影响代谢能力。</li>
                  <li><strong>吸烟:</strong> 吸烟者通常会加速咖啡因的代谢。</li>
                  <li><strong>怀孕与激素水平:</strong> 怀孕期间咖啡因代谢会显著减慢。</li>
                  <li><strong>药物相互作用:</strong> 某些药物（如口服避孕药、某些抗生素、抗抑郁药等）会减慢咖啡因代谢；另一些则可能加速。</li>
                  <li><strong>年龄和健康状况:</strong> 年龄和整体健康状况也可能产生影响。</li>
                </ul>
                因此，默认的数据都只是<strong>估算</strong>，无法完全反映复杂的生理过程。
              </li>
              <li>
                <strong>睡眠建议:</strong> 基于估算的浓度和设定的阈值计算得出，仅作为<strong>参考</strong>。个体对咖啡因导致睡眠障碍的敏感度差异很大，有些人即使在较低浓度下也会受到影响。
              </li>
            </ul>
          </div>

          {/* 个性化调整建议 */}
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: colors.successBg,
              color: colors.successText,
              borderColor: colors.successText, // Use themed border color
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            <h3 className="font-semibold mb-2 flex items-center">
              <BookOpen size={16} className="mr-1.5" aria-hidden="true" /> 个性化调整建议
            </h3>
            <p>
              <strong>我们强烈建议结合自身的实际感受和经验，在"设置"页面仔细调整关键参数：</strong>
            </p>
            <ul className="list-disc list-inside mt-2 space-y-2">
              <li>
                <strong>咖啡因半衰期 (小时):</strong> 如果您感觉咖啡因的效果持续时间比一般人长（例如，下午喝咖啡晚上就睡不着），尝试<strong>增加</strong>半衰期；如果您感觉效果消失得很快，可以尝试<strong>减少</strong>半衰期。
              </li>
              <li>
                <strong>睡前安全浓度阈值 (mg/L):</strong> 如果您对咖啡因非常敏感，即使在推荐阈值下仍感觉影响睡眠，请<strong>降低</strong>此阈值；如果您相对不敏感，可以适当<strong>提高</strong>。
              </li>
            </ul>
            <p className="mt-2">
              <strong>通过个性化调整，您可以让应用的估算结果更贴合您的个人情况，但请始终记住这仍然是估算。</strong>
            </p>
          </div>
          
        </div>
      </section>

      {/* 免责声明卡片 */}
      <section
        aria-labelledby="disclaimer-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="disclaimer-heading"
          className="text-xl font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <AlertTriangle size={20} className="mr-2" aria-hidden="true" /> 免责声明
        </h2>

        <div className="text-sm transition-colors" style={{ color: colors.textSecondary }}>
          <p>
            咖啡因追踪器应用提供的所有数据、建议和预测仅供参考，不能替代专业医疗建议。应用内的计算基于简化模型和平均值，实际个体代谢情况可能有很大差异。
          </p>
          <p className="mt-2">
            本应用不对使用者因使用本应用提供的信息而产生的任何健康问题或决策后果负责。如果您有健康问题或对咖啡因摄入有特殊关注点，请咨询医疗专业人士。
          </p>
          <p className="mt-2">
            预设饮品的咖啡因含量数据来源于公开资料，可能与特定产品的实际含量有所不同。用户应根据自身情况调整设置或自定义饮品数据。
          </p>
        </div>
      </section>
    </>
  );
};

export default AboutView;