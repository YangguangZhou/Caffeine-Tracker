// constants.js - 应用常量和默认值

// 饮品分类
export const DEFAULT_CATEGORY = '其他';
export const DRINK_CATEGORIES = ['手工咖啡', '速溶咖啡', '连锁品牌', '瓶装茶饮', '碳酸饮料', '功能饮料', DEFAULT_CATEGORY];

// 默认设置
export const defaultSettings = {
  weight: 60, // 默认体重（kg）
  gender: 'male', // 默认性别 (当前未用于计算，但保留用于未来可能的功能)
  maxDailyCaffeine: 400, // 默认每日最大咖啡因摄入量（mg） - FDA/Mayo Clinic 通用指南
  recommendedDosePerKg: 5, // 推荐剂量 (mg/kg) - 用于个性化推荐 (建议范围 3-6)
  safeSleepThresholdConcentration: 1.5, // 睡前安全咖啡因浓度阈值 (mg/L) - 示例值，根据敏感度调整
  volumeOfDistribution: 0.6, // 分布容积 (L/kg) - 咖啡因的典型值
  plannedSleepTime: '22:00', // 默认计划睡眠时间
  caffeineHalfLifeHours: 4, // 默认咖啡因半衰期（小时） - 平均值，用户可调整
  themeMode: 'auto', // 'auto', 'light', 'dark'
  // WebDAV 同步设置
  webdavEnabled: false, // 默认禁用 WebDAV 同步
  webdavServer: '', // WebDAV 服务器地址
  webdavUsername: '', // WebDAV 用户名
  webdavPassword: '', // WebDAV 密码
  webdavSyncFrequency: 'manual', // 同步频率，可选: 'manual'(手动), 'startup'(启动时), 'hourly'(每小时), 'daily'(每天)
  lastSyncTimestamp: null, // 上次同步时间戳
  develop: false,
};

// 咖啡主题颜色方案（日间模式）
export const COFFEE_COLORS = {
  espresso: '#4a2c2a', // 深棕色（主要文本/强调元素）
  latte: '#c69c6d',    // 浅棕色/米色（次要元素）
  cappuccino: '#a0522d', // 赭石色/中棕色（强调/图表柱）
  accent: '#8b4513',    // 马鞍棕色（按钮/高亮）
  warning: '#f59e0b',   // amber-500（警告）
  danger: '#ef4444',    // red-500（危险/高水平）
  safe: '#10b981',      // emerald-500（安全/低水平）
  grid: '#edeae4',      // 更柔和的网格线/边框
  tooltipBg: 'rgba(255, 255, 255, 0.95)', // 白色带透明度
  tooltipText: '#4a2c2a',
  bgBase: '#fdfbf6',    // 非常浅的米色背景
  bgCard: '#ffffff',    // 卡片白色
  textPrimary: '#4a2c2a', // 深棕色
  textSecondary: '#78350f', // Amber-800
  textMuted: '#a16207',   // Amber-700
  borderSubtle: '#f3eade', // 较浅的米色边框
  borderStrong: '#d2b48c', // 棕褐色边框
  customDrinkBg: '#f0fdf4', // 自定义饮品的浅绿色背景
  customDrinkBorder: '#bbf7d0', // 自定义饮品边框
  customDrinkText: '#166534', // 自定义饮品文本
  chartLine: '#8b4513', // 代谢线的马鞍棕色
  chartNowLine: '#dc2626', // 当前时间的红线
  chartSleepLine: '#3b82f6', // 睡眠阈值的蓝线
  customDrinkBg: '#FFF6E9',
  customDrinkBorder: '#FFE2B8',
  customDrinkText: '#8B5A2B',

  // Standard status colors
  successBg: '#f0fdf4', // Light green (emerald-50 like)
  successText: '#065f46', // Dark green (emerald-800 like)
  warningBg: '#fffbeb', // Light yellow (amber-50 like)
  warningText: '#b45309', // Dark yellow (amber-700 like)
  dangerBg: '#fef2f2', // Light red (red-50 like)
  dangerText: '#b91c1c', // Dark red (red-700 like)
  infoBg: '#eff6ff', // Light blue (blue-50 like)
  infoText: '#1d4ed8', // Dark blue (blue-700 like)
};

// 夜间模式颜色方案
export const NIGHT_COLORS = {
  espresso: '#d4c0a1', // 浅棕色（主要文本/强调元素）
  latte: '#8c7b5c',     // 深米色（次要元素）
  cappuccino: '#a07455', // 棕色（强调/图表柱）
  accent: '#c39065',    // 浅棕色（按钮/高亮）
  warning: '#f59e0b',   // amber-500（警告）
  danger: '#ef4444',    // red-500（危险/高水平）
  safe: '#10b981',      // emerald-500（安全/低水平）
  grid: '#312e2b',      // 更柔和的深色网格线/边框
  tooltipBg: 'rgba(28, 25, 23, 0.95)', // 深棕色带透明度
  tooltipText: '#e7e5e4',
  bgBase: '#1c1917',    // 非常深的背景
  bgCard: '#24211e',    // 深色卡片背景
  borderSubtle: '#3f3b36', // 微妙的边框
  borderStrong: '#57534e', // 强边框
  espresso: '#f5e5d3',  // 浓缩咖啡色（亮文本）
  textPrimary: '#e7e5e4', // 主要文本
  textSecondary: '#a8a29e', // 次要文本
  textMuted: '#78716c',   // 静音文本
  infoBg: 'rgba(59, 130, 246, 0.1)',
  infoText: '#93c5fd',
  successBg: 'rgba(16, 185, 129, 0.1)',
  successText: '#6ee7b7',
  warningBg: 'rgba(245, 158, 11, 0.1)',
  warningText: '#fcd34d',
  dangerBg: 'rgba(239, 68, 68, 0.1)',
  dangerText: '#fca5a5',
  dangerBorder: '#5f2b2b', // 深色模式下的危险边框
};

// 分类感知的预设图标配色生成工具
const CATEGORY_COLOR_RANGES = {
  '手工咖啡': { hueStart: 14, hueEnd: 46, saturationMin: 55, saturationMax: 78, lightnessMin: 42, lightnessMax: 62 },
  '速溶咖啡': { hueStart: 8, hueEnd: 40, saturationMin: 60, saturationMax: 82, lightnessMin: 45, lightnessMax: 64 },
  '连锁品牌': { hueStart: 24, hueEnd: 56, saturationMin: 52, saturationMax: 76, lightnessMin: 42, lightnessMax: 60 },
  '瓶装茶饮': { hueStart: 88, hueEnd: 150, saturationMin: 45, saturationMax: 75, lightnessMin: 48, lightnessMax: 66 },
  '碳酸饮料': { hueStart: 180, hueEnd: 240, saturationMin: 58, saturationMax: 82, lightnessMin: 48, lightnessMax: 68 },
  '功能饮料': { hueStart: 36, hueEnd: 72, saturationMin: 62, saturationMax: 88, lightnessMin: 48, lightnessMax: 68 },
  [DEFAULT_CATEGORY]: { hueStart: 300, hueEnd: 348, saturationMin: 58, saturationMax: 80, lightnessMin: 50, lightnessMax: 68 },
  fallback: { hueStart: 0, hueEnd: 360, saturationMin: 55, saturationMax: 80, lightnessMin: 46, lightnessMax: 66 },
};

const normalizeHash = (value) => {
  const positive = Math.abs(value);
  return (positive % 2147483647) / 2147483647;
};

const hashString = (source, fallbackSeed = 0) => {
  if (!source) {
    return normalizeHash(fallbackSeed * 2654435761);
  }

  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }

  return normalizeHash(hash);
};

const hslChannelToRgb = (p, q, t) => {
  let value = t;
  if (value < 0) value += 1;
  if (value > 1) value -= 1;
  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
  return p;
};

const hslToHex = (hue, saturation, lightness) => {
  const h = hue / 360;
  const s = saturation / 100;
  const l = lightness / 100;

  if (s === 0) {
    const value = Math.round(l * 255)
      .toString(16)
      .padStart(2, '0');
    return `#${value}${value}${value}`;
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = Math.round(hslChannelToRgb(p, q, h + 1 / 3) * 255)
    .toString(16)
    .padStart(2, '0');
  const g = Math.round(hslChannelToRgb(p, q, h) * 255)
    .toString(16)
    .padStart(2, '0');
  const b = Math.round(hslChannelToRgb(p, q, h - 1 / 3) * 255)
    .toString(16)
    .padStart(2, '0');

  return `#${r}${g}${b}`;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getCategoryColorRange = (category) => {
  if (!category) return CATEGORY_COLOR_RANGES[DEFAULT_CATEGORY] || CATEGORY_COLOR_RANGES.fallback;
  return CATEGORY_COLOR_RANGES[category] || CATEGORY_COLOR_RANGES[DEFAULT_CATEGORY] || CATEGORY_COLOR_RANGES.fallback;
};

const generateBasePresetHsl = (id, category, fallbackIndex = 0) => {
  const range = getCategoryColorRange(category);
  const hueWidth = Math.max(range.hueEnd - range.hueStart, 1);
  const saturationWidth = Math.max(range.saturationMax - range.saturationMin, 1);
  const lightnessWidth = Math.max(range.lightnessMax - range.lightnessMin, 1);

  const hueHash = hashString(`${category}:${id}:h`, fallbackIndex);
  const satHash = hashString(`${category}:${id}:s`, fallbackIndex + 7);
  const lightHash = hashString(`${category}:${id}:l`, fallbackIndex + 13);

  const hue = range.hueStart + hueHash * hueWidth;
  const saturation = range.saturationMin + satHash * saturationWidth;
  const lightness = range.lightnessMin + lightHash * lightnessWidth;

  return {
    h: hue,
    s: saturation,
    l: lightness,
    range,
    seed: `${category}:${id}`,
  };
};

const wrapHueWithinRange = (value, range) => {
  const width = range.hueEnd - range.hueStart;
  if (width <= 0) return range.hueStart;
  let normalized = (value - range.hueStart) % width;
  if (normalized < 0) normalized += width;
  return range.hueStart + normalized;
};

const ensureContrast = (baseHsl, previousHsl) => {
  if (!previousHsl) {
    return baseHsl;
  }

  const { range, seed } = baseHsl;
  const hueWidth = Math.max(range.hueEnd - range.hueStart, 1);
  const lightWidth = Math.max(range.lightnessMax - range.lightnessMin, 1);

  const minHueDelta = Math.min(Math.max(hueWidth * 0.35, 12), hueWidth);
  const minLightDelta = Math.min(Math.max(lightWidth * 0.45, 9), lightWidth);

  let h = baseHsl.h;
  let s = baseHsl.s;
  let l = baseHsl.l;

  if (Math.abs(h - previousHsl.h) < minHueDelta && hueWidth > 0) {
    const direction = hashString(`${seed}-hue-contrast`) >= 0.5 ? 1 : -1;
    const hueShift = Math.max(minHueDelta, hueWidth / 2.5);
    h = wrapHueWithinRange(previousHsl.h + direction * hueShift, range);
  }

  if (Math.abs(l - previousHsl.l) < minLightDelta && lightWidth > 0) {
    const direction = hashString(`${seed}-light-contrast`) >= 0.5 ? 1 : -1;
    const lightShift = Math.min(Math.max(minLightDelta, lightWidth / 2), lightWidth);
    l = clamp(previousHsl.l + direction * lightShift, range.lightnessMin, range.lightnessMax);
    if (Math.abs(l - previousHsl.l) < minLightDelta) {
      l = direction > 0 ? range.lightnessMax : range.lightnessMin;
    }
  }

  // 轻微调整饱和度以保持在可辨识范围
  if (s < range.saturationMin) s = range.saturationMin;
  if (s > range.saturationMax) s = range.saturationMax;

  return { h, s, l, range, seed };
};

const createCategoryColorGenerator = () => {
  const lastHslByCategory = new Map();
  return (id, category, fallbackIndex = 0) => {
    const targetCategory = category || DEFAULT_CATEGORY;
    const baseHsl = generateBasePresetHsl(id, targetCategory, fallbackIndex);
    const previousHsl = lastHslByCategory.get(targetCategory);
    const adjusted = ensureContrast(baseHsl, previousHsl);
    lastHslByCategory.set(targetCategory, adjusted);
    return {
      hex: hslToHex(adjusted.h, adjusted.s, adjusted.l),
      hsl: adjusted,
    };
  };
};

export const getPresetIconColor = (id, category = DEFAULT_CATEGORY, fallbackIndex = 0) => {
  const baseHsl = generateBasePresetHsl(id, category || DEFAULT_CATEGORY, fallbackIndex);
  return hslToHex(baseHsl.h, baseHsl.s, baseHsl.l);
};

// 预设饮品定义
const presetDrinkDefinitions = [
  // --- 手工咖啡 (Craft Coffee) ---
  { id: 'preset-hand-drip', name: '手冲咖啡', category: '手工咖啡', calculationMode: 'perGram', caffeinePerGram: 12, defaultVolume: 15, caffeineContent: null, isPreset: true },
  { id: 'preset-espresso', name: '浓缩咖啡', category: '手工咖啡', calculationMode: 'per100ml', caffeineContent: 200, caffeinePerGram: null, defaultVolume: 30, isPreset: true },
  { id: 'preset-drip', name: '滴滤咖啡', category: '手工咖啡', calculationMode: 'per100ml', caffeineContent: 60, caffeinePerGram: null, defaultVolume: 355, isPreset: true },
  { id: 'preset-cold-brew', name: '冷萃咖啡', category: '手工咖啡', calculationMode: 'per100ml', caffeineContent: 43, caffeinePerGram: null, defaultVolume: 200, isPreset: true },
  { id: 'preset-americano-generic', name: '美式咖啡', category: '手工咖啡', calculationMode: 'per100ml', caffeineContent: 45, caffeinePerGram: null, defaultVolume: 240, isPreset: true },
  { id: 'preset-latte-generic', name: '拿铁咖啡', category: '手工咖啡', calculationMode: 'per100ml', caffeineContent: 30, caffeinePerGram: null, defaultVolume: 240, isPreset: true },
  { id: 'preset-cappuccino', name: '卡布奇诺', category: '手工咖啡', calculationMode: 'per100ml', caffeineContent: 30, caffeinePerGram: null, defaultVolume: 240, isPreset: true },

  // --- 连锁品牌 (Chain Brands) ---
  { id: 'preset-starbucks-americano', name: '星巴克 美式', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 38.59, caffeinePerGram: null, defaultVolume: 355, isPreset: true },
  { id: 'preset-starbucks-latte', name: '星巴克 拿铁', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 27.89, caffeinePerGram: null, defaultVolume: 355, isPreset: true },
  { id: 'preset-luckin-americano', name: '瑞幸 美式', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 50, caffeinePerGram: null, defaultVolume: 450, isPreset: true },
  { id: 'preset-luckin-latte', name: '瑞幸 拿铁', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 33.33, caffeinePerGram: null, defaultVolume: 450, isPreset: true },
  { id: 'preset-manner-americano', name: 'MANNER 美式', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 56.34, caffeinePerGram: null, defaultVolume: 355, isPreset: true },
  { id: 'preset-manner-latte', name: 'MANNER 拿铁', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 52.39, caffeinePerGram: null, defaultVolume: 355, isPreset: true },
  { id: 'preset-costa-americano', name: 'COSTA 美式', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 47.29, caffeinePerGram: null, defaultVolume: 480, isPreset: true },
  { id: 'preset-costa-latte', name: 'COSTA 拿铁', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 36.88, caffeinePerGram: null, defaultVolume: 480, isPreset: true },
  { id: 'preset-mcd-americano', name: '麦当劳 美式', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 44.4, caffeinePerGram: null, defaultVolume: 400, isPreset: true },
  { id: 'preset-mcd-latte', name: '麦当劳 拿铁', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 42.75, caffeinePerGram: null, defaultVolume: 400, isPreset: true },
  { id: 'preset-kfc-americano', name: '肯德基 美式', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 37.50, caffeinePerGram: null, defaultVolume: 400, isPreset: true },
  { id: 'preset-kfc-latte', name: '肯德基 拿铁', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 16.50, caffeinePerGram: null, defaultVolume: 400, isPreset: true },
  { id: 'preset-tims-americano', name: 'Tims 美式', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 34.00, caffeinePerGram: null, defaultVolume: 350, isPreset: true },
  { id: 'preset-tims-latte', name: 'Tims 拿铁', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 22.57, caffeinePerGram: null, defaultVolume: 350, isPreset: true },
  { id: 'preset-cotti-americano', name: 'COTTI 美式', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 34.00, caffeinePerGram: null, defaultVolume: 400, isPreset: true },
  { id: 'preset-cotti-latte', name: 'COTTI 拿铁', category: '连锁品牌', calculationMode: 'per100ml', caffeineContent: 43.00, caffeinePerGram: null, defaultVolume: 400, isPreset: true },

  // --- 速溶咖啡 (Instant) ---
  { id: 'preset-instant', name: '速溶咖啡', category: '速溶咖啡', calculationMode: 'per100ml', caffeineContent: 45, caffeinePerGram: null, defaultVolume: 200, isPreset: true },
  { id: 'preset-nescafe-gold', name: '雀巢金牌速溶', category: '速溶咖啡', calculationMode: 'per100ml', caffeineContent: 40, caffeinePerGram: null, defaultVolume: 150, isPreset: true },
  { id: 'preset-nescafe-black', name: '雀巢速溶黑咖啡', category: '速溶咖啡', calculationMode: 'per100ml', caffeineContent: 35, caffeinePerGram: null, defaultVolume: 150, isPreset: true },
  { id: 'preset-saturnbird', name: '三顿半咖啡', category: '速溶咖啡', calculationMode: 'per100ml', caffeineContent: 45, caffeinePerGram: null, defaultVolume: 200, isPreset: true },
  { id: 'preset-sumida', name: '隅田川咖啡', category: '速溶咖啡', calculationMode: 'per100ml', caffeineContent: 20, caffeinePerGram: null, defaultVolume: 200, isPreset: true },
  { id: 'preset-huatiancui-latte', name: '花田萃拿铁', category: '速溶咖啡', calculationMode: 'per100ml', caffeineContent: 68, caffeinePerGram: null, defaultVolume: 150, isPreset: true },
  { id: 'preset-huatiancui-fruit', name: '花田萃水果美式', category: '速溶咖啡', calculationMode: 'per100ml', caffeineContent: 28, caffeinePerGram: null, defaultVolume: 250, isPreset: true },
  { id: 'preset-liancafe-daily', name: '连咖啡每日鲜萃', category: '速溶咖啡', calculationMode: 'per100ml', caffeineContent: 22.5, caffeinePerGram: null, defaultVolume: 200, isPreset: true },
  { id: 'preset-liancafe-ranran', name: '连咖啡燃燃咖', category: '速溶咖啡', calculationMode: 'per100ml', caffeineContent: 14, caffeinePerGram: null, defaultVolume: 260, isPreset: true },

  // --- 瓶装茶饮 (Bottled Tea) ---
  { id: 'preset-black-tea', name: '红茶', category: '瓶装茶饮', calculationMode: 'per100ml', caffeineContent: 47, caffeinePerGram: null, defaultVolume: 240, isPreset: true },
  { id: 'preset-green-tea', name: '绿茶', category: '瓶装茶饮', calculationMode: 'per100ml', caffeineContent: 28, caffeinePerGram: null, defaultVolume: 240, isPreset: true },
  { id: 'preset-milk-tea', name: '奶茶', category: '瓶装茶饮', calculationMode: 'per100ml', caffeineContent: 25, caffeinePerGram: null, defaultVolume: 350, isPreset: true },
  { id: 'preset-chagee', name: '霸王茶姬 (中杯)', category: '瓶装茶饮', calculationMode: 'per100ml', caffeineContent: 35, caffeinePerGram: null, defaultVolume: 470, isPreset: true },
  { id: 'preset-chagee-large', name: '霸王茶姬 (大杯)', category: '瓶装茶饮', calculationMode: 'per100ml', caffeineContent: 35, caffeinePerGram: null, defaultVolume: 580, isPreset: true },
  { id: 'preset-tea-pi', name: '茶π', category: '瓶装茶饮', calculationMode: 'per100ml', caffeineContent: 9.4, caffeinePerGram: null, defaultVolume: 500, isPreset: true },
  { id: 'preset-oriental-leaf', name: '东方树叶', category: '瓶装茶饮', calculationMode: 'per100ml', caffeineContent: 11, caffeinePerGram: null, defaultVolume: 500, isPreset: true },
  { id: 'preset-suntory-oolong', name: '三得利 乌龙茶', category: '瓶装茶饮', calculationMode: 'per100ml', caffeineContent: 13.7, caffeinePerGram: null, defaultVolume: 500, isPreset: true },
  { id: 'preset-kangshifu-icetea', name: '康师傅 冰红茶', category: '瓶装茶饮', calculationMode: 'per100ml', caffeineContent: 4.8, caffeinePerGram: null, defaultVolume: 500, isPreset: true },

  // --- 碳酸饮料 (Carbonated Drinks) ---
  { id: 'preset-coca-cola', name: '可口可乐', category: '碳酸饮料', calculationMode: 'per100ml', caffeineContent: 10, caffeinePerGram: null, defaultVolume: 330, isPreset: true },
  { id: 'preset-pepsi-cola', name: '百事可乐', category: '碳酸饮料', calculationMode: 'per100ml', caffeineContent: 10.6, caffeinePerGram: null, defaultVolume: 330, isPreset: true },

  // --- 功能饮料 (Functional Drinks) ---
  { id: 'preset-redbull', name: '红牛', category: '功能饮料', calculationMode: 'per100ml', caffeineContent: 20, caffeinePerGram: null, defaultVolume: 250, isPreset: true },
  { id: 'preset-dongpeng', name: '东鹏特饮', category: '功能饮料', calculationMode: 'per100ml', caffeineContent: 20, caffeinePerGram: null, defaultVolume: 250, isPreset: true },
  { id: 'preset-monster', name: '魔爪', category: '功能饮料', calculationMode: 'per100ml', caffeineContent: 28, caffeinePerGram: null, defaultVolume: 330, isPreset: true },

  // --- 其他 (Other) ---
  { id: 'preset-dark-chocolate', name: '黑巧克力(100g)', category: '其他', calculationMode: 'per100ml', caffeineContent: 43, caffeinePerGram: null, defaultVolume: 100, isPreset: true },
];

const presetColorGenerator = createCategoryColorGenerator();

export const initialPresetDrinks = presetDrinkDefinitions.map((drink, index) => {
  const category = drink.category || DEFAULT_CATEGORY;
  const colorResult = presetColorGenerator(drink.id, category, index);
  return {
    ...drink,
    iconColor: colorResult.hex,
  };
});

// 存储原始预设ID用于参考（例如，用于删除逻辑）
export const originalPresetDrinkIds = new Set(initialPresetDrinks.map(d => d.id));

export const applyPresetIconColors = (drinks) => {
  const generator = createCategoryColorGenerator();
  return drinks.map((drink, index) => {
    if (!drink) return drink;

    const category = drink.category || DEFAULT_CATEGORY;
    const isOriginalPreset = drink.id ? originalPresetDrinkIds.has(drink.id) : false;
    const isPreset = drink.isPreset ?? isOriginalPreset;

    if (!isPreset) {
      return {
        ...drink,
        category,
        isPreset: false,
        iconColor: drink.iconColor ?? null,
      };
    }

    const seedId = drink.id || `${category}-${index}`;
    const colorResult = generator(seedId, category, index);

    return {
      ...drink,
      category,
      isPreset: true,
      iconColor: colorResult.hex,
    };
  });
};
