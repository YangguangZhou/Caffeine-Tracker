export const generateFeedbackMailto = (type, appConfig, isNativePlatform, errorDetails = null) => {
  const subjectPrefix = '咖啡因追踪器';
  let subject = '';
  let bodyTemplate = '';

  const commonInfo = `
【其他信息】
- 应用版本: ${appConfig?.latest_version || '未知'}
- 平台: ${isNativePlatform ? 'App客户端' : '网页版'}
- 浏览器: ${navigator.userAgent}
- 时间: ${new Date().toLocaleString()}
`;

  if (type === 'feedback') {
    subject = `${subjectPrefix} - 问题反馈`;
    bodyTemplate = `您好！

我在使用咖啡因追踪器时遇到了以下问题：

【问题描述】
请详细描述您遇到的问题...

【复现步骤】
1. 
2. 
3. 

【期望结果】
您期望应该发生什么...

【实际结果】
实际发生了什么...
`;
  } else if (type === 'suggestion') {
    subject = `${subjectPrefix} - 功能建议`;
    bodyTemplate = `您好！

我对咖啡因追踪器有以下建议：

【建议内容】
请详细描述您的建议...

【使用场景】
在什么情况下需要这个功能...

【期望效果】
您希望这个功能能够实现什么...
`;
  } else if (type === 'sync_error') {
    subject = `${subjectPrefix} - 同步错误反馈`;
    bodyTemplate = `您好！

我在使用 WebDAV 同步功能时遇到了错误：

【错误信息】
${errorDetails || '无详细错误信息'}

【操作步骤】
请描述您在进行什么操作时出现了此错误...

`;
  }

  const body = encodeURIComponent(bodyTemplate + commonInfo + '\n感谢您的反馈！');
  const encodedSubject = encodeURIComponent(subject);

  return `mailto:i@jerryz.com.cn?subject=${encodedSubject}&body=${body}`;
};
