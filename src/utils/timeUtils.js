// timeUtils.js - 时间相关工具函数

/**
 * 将日期格式化为YYYY-MM-DDTHH:mm格式（适用于datetime-local输入）
 * @param {Date|number} date 日期对象或时间戳
 * @returns {string} 格式化后的日期时间字符串
 */
export const formatDatetimeLocal = (date) => {
  const d = new Date(date);
  // 调整时区偏移，以在datetime-local输入中正确显示
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  try {
    return d.toISOString().slice(0, 16);
  } catch (e) {
    console.error("格式化日期出错:", date, e);
    // 作为后备返回当前时间
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }
};

/**
 * 将时间戳格式化为可读时间（HH:MM）
 * @param {number} timestamp 时间戳
 * @returns {string} 格式化后的时间字符串
 */
export const formatTime = (timestamp) => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (e) {
    console.error("格式化时间出错:", timestamp, e);
    return "无效时间";
  }
};

/**
 * 将时间戳格式化为可读日期（根据区域设置）
 * @param {number} timestamp 时间戳
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (timestamp) => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  } catch (e) {
    console.error("格式化日期出错:", timestamp, e);
    return "无效日期";
  }
};

/**
 * 获取指定日期的开始时间（00:00:00）
 * @param {Date|number} date 日期对象或时间戳
 * @returns {number} 时间戳
 */
export const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * 获取指定日期的结束时间（23:59:59.999）
 * @param {Date|number} date 日期对象或时间戳
 * @returns {number} 时间戳
 */
export const getEndOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

/**
 * 获取指定日期所在周的开始时间（周一00:00:00）
 * @param {Date|number} date 日期对象或时间戳
 * @returns {number} 时间戳
 */
export const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 星期日 = 0, 星期一 = 1, ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整至周一
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * 获取指定日期所在周的结束时间（周日23:59:59.999）
 * @param {Date|number} date 日期对象或时间戳
 * @returns {number} 时间戳
 */
export const getEndOfWeek = (date) => {
  const startOfWeek = getStartOfWeek(date);
  const d = new Date(startOfWeek);
  d.setDate(d.getDate() + 6); // 加6天得到周日
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

/**
 * 获取指定日期所在月的开始时间（1日00:00:00）
 * @param {Date|number} date 日期对象或时间戳
 * @returns {number} 时间戳
 */
export const getStartOfMonth = (date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * 获取指定日期所在月的结束时间（最后一天23:59:59.999）
 * @param {Date|number} date 日期对象或时间戳
 * @returns {number} 时间戳
 */
export const getEndOfMonth = (date) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1); // 转到下个月
  d.setDate(0); // 回到上个月的最后一天
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

/**
 * 获取指定日期所在年的开始时间（1月1日00:00:00）
 * @param {Date|number} date 日期对象或时间戳
 * @returns {number} 时间戳
 */
export const getStartOfYear = (date) => {
  const d = new Date(date);
  d.setMonth(0, 1); // 设置为1月1日
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * 获取指定日期所在年的结束时间（12月31日23:59:59.999）
 * @param {Date|number} date 日期对象或时间戳
 * @returns {number} 时间戳
 */
export const getEndOfYear = (date) => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear(), 11, 31); // 设置为12月31日
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

/**
 * 检查日期是否为今天
 * @param {Date} date 日期对象
 * @returns {boolean} 是否为今天
 */
export const isToday = (date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

/**
 * 检查日期是否在未来（严格晚于今天）
 * @param {Date} date 日期对象
 * @returns {boolean} 是否在未来
 */
export const isFuture = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 比较当天开始
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate > today;
};

/**
 * 将时间字符串（如"22:00"）转换为当天该时间的Date对象
 * @param {string} timeString 时间字符串（格式为"HH:MM"）
 * @returns {Date} 时间对象
 */
export const timeStringToDate = (timeString) => {
  const today = new Date();
  const [hours, minutes] = timeString.split(':').map(Number);

  if (isNaN(hours) || isNaN(minutes)) {
    return today; // 如果解析失败，返回当前时间
  }

  today.setHours(hours, minutes, 0, 0);
  return today;
};

/**
 * 格式化时间间隔（将小时数转换为小时和分钟）
 * @param {number} hours 小时数
 * @returns {string} 格式化后的时间间隔
 */
export const formatHoursDuration = (hours) => {
  if (!hours && hours !== 0) return '未知';
  if (hours === 0) return '0小时';

  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (wholeHours === 0) {
    return `${minutes}分钟`;
  } else if (minutes === 0) {
    return `${wholeHours}小时`;
  } else {
    return `${wholeHours}小时${minutes}分钟`;
  }
};