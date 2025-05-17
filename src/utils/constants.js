// constants.js - 应用常量和默认值

// 饮品分类
export const DRINK_CATEGORIES = ['手工咖啡', '速溶咖啡', '连锁品牌', '瓶装茶饮', '碳酸饮料', '功能饮料'];
export const DEFAULT_CATEGORY = '其他';

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
  grid: '#e0d6c7',      // 较浅的棕褐色（网格线/边框）
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
  grid: '#2d2922',      // 深棕色（网格线/边框）
  tooltipBg: 'rgba(28, 25, 23, 0.95)', // 深棕色带透明度
  tooltipText: '#e7e5e4',
  bgBase: '#1c1917',    // 非常深的背景
  bgCard: '#292524',    // 卡片深棕色
  textPrimary: '#e7e5e4', // 浅色文本
  textSecondary: '#d6d3d1', // 较浅文本
  textMuted: '#a8a29e',   // 低调文本
  borderSubtle: '#44403c', // 细微边框
  borderStrong: '#78716c', // 强调边框
  customDrinkBg: '#022c22', // 自定义饮品的深绿色背景
  customDrinkBorder: '#065f46', // 自定义饮品边框
  customDrinkText: '#6ee7b7', // 自定义饮品文本
  chartLine: '#c39065', // 代谢线的浅棕色
  chartNowLine: '#ef4444', // 当前时间的红线
  chartSleepLine: '#3b82f6', // 睡眠阈值的蓝线
  customDrinkBg: '#3D3222',
  customDrinkBorder: '#5E4C32',
  customDrinkText: '#D4A76A',

  // Standard status colors
  successBg: '#22332E', // 更深的绿色背景
  successText: '#6ee7b7', // Lighter green text
  warningBg: '#332B22', // 更深的黄色/橙色背景
  warningText: '#fcd34d', // Lighter yellow text
  dangerBg: '#332222',  // 更深的红色背景
  dangerText: '#fca5a5', // Lighter red text
  infoBg: '#222833',    // 更深的蓝色背景
  infoText: '#93c5fd', // Lighter blue text
};

// 预设饮品定义
export const initialPresetDrinks = [
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

// 存储原始预设ID用于参考（例如，用于删除逻辑）
export const originalPresetDrinkIds = new Set(initialPresetDrinks.map(d => d.id));