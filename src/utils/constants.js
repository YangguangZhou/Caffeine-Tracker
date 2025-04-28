// constants.js - 应用常量和默认值

// 饮品分类
export const DRINK_CATEGORIES = ['通用', '连锁咖啡', '茶饮', '速溶', '其他'];
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
};

// 预设饮品定义
export const initialPresetDrinks = [
  // --- 通用 (Generic) ---
  { id: 'preset-espresso', name: '浓缩咖啡', category: '通用', caffeineContent: 212, defaultVolume: 30, isPreset: true },
  { id: 'preset-drip', name: '滴滤咖啡', category: '通用', caffeineContent: 95, defaultVolume: 240, isPreset: true },
  { id: 'preset-americano-generic', name: '美式咖啡', category: '通用', caffeineContent: 80, defaultVolume: 355, isPreset: true },
  { id: 'preset-latte-generic', name: '拿铁咖啡', category: '通用', caffeineContent: 55, defaultVolume: 355, isPreset: true },
  { id: 'preset-cappuccino', name: '卡布奇诺', category: '通用', caffeineContent: 60, defaultVolume: 240, isPreset: true },

  // --- 连锁咖啡 (Coffee Chains - 按感知受欢迎程度排序) ---
  { id: 'preset-starbucks-americano', name: '星巴克 美式', category: '连锁咖啡', caffeineContent: 38.59, defaultVolume: 355, isPreset: true },
  { id: 'preset-starbucks-latte', name: '星巴克 拿铁', category: '连锁咖啡', caffeineContent: 27.89, defaultVolume: 355, isPreset: true },
  { id: 'preset-luckin-americano', name: '瑞幸 美式', category: '连锁咖啡', caffeineContent: 50, defaultVolume: 450, isPreset: true },
  { id: 'preset-luckin-latte', name: '瑞幸 拿铁', category: '连锁咖啡', caffeineContent: 33.33, defaultVolume: 450, isPreset: true },
  { id: 'preset-manner-americano', name: 'MANNER 美式', category: '连锁咖啡', caffeineContent: 56.34, defaultVolume: 355, isPreset: true },
  { id: 'preset-manner-latte', name: 'MANNER 拿铁', category: '连锁咖啡', caffeineContent: 52.39, defaultVolume: 355, isPreset: true },
  { id: 'preset-costa-americano', name: 'COSTA 美式', category: '连锁咖啡', caffeineContent: 47.29, defaultVolume: 480, isPreset: true },
  { id: 'preset-costa-latte', name: 'COSTA 拿铁', category: '连锁咖啡', caffeineContent: 36.88, defaultVolume: 480, isPreset: true },
  { id: 'preset-mcd-americano', name: '麦当劳 美式', category: '连锁咖啡', caffeineContent: 44.4, defaultVolume: 400, isPreset: true },
  { id: 'preset-mcd-latte', name: '麦当劳 拿铁', category: '连锁咖啡', caffeineContent: 42.75, defaultVolume: 400, isPreset: true },
  { id: 'preset-kfc-americano', name: '肯德基 美式', category: '连锁咖啡', caffeineContent: 37.50, defaultVolume: 400, isPreset: true },
  { id: 'preset-kfc-latte', name: '肯德基 拿铁', category: '连锁咖啡', caffeineContent: 16.50, defaultVolume: 400, isPreset: true },
  { id: 'preset-tims-americano', name: 'Tims 美式', category: '连锁咖啡', caffeineContent: 34.00, defaultVolume: 350, isPreset: true },
  { id: 'preset-tims-latte', name: 'Tims 拿铁', category: '连锁咖啡', caffeineContent: 22.57, defaultVolume: 350, isPreset: true },
  { id: 'preset-cotti-americano', name: 'COTTI 美式', category: '连锁咖啡', caffeineContent: 34.00, defaultVolume: 400, isPreset: true },
  { id: 'preset-cotti-latte', name: 'COTTI 拿铁', category: '连锁咖啡', caffeineContent: 43.00, defaultVolume: 400, isPreset: true },

  // --- 茶饮 (Tea) ---
  { id: 'preset-black-tea', name: '红茶', category: '茶饮', caffeineContent: 47, defaultVolume: 240, isPreset: true },
  { id: 'preset-green-tea', name: '绿茶', category: '茶饮', caffeineContent: 28, defaultVolume: 240, isPreset: true },
  { id: 'preset-chagee', name: '霸王茶姬 (中杯)', category: '茶饮', caffeineContent: 35, defaultVolume: 470, isPreset: true },
  { id: 'preset-chagee-large', name: '霸王茶姬 (大杯)', category: '茶饮', caffeineContent: 35, defaultVolume: 580, isPreset: true },

  // --- 速溶 (Instant) ---
  { id: 'preset-instant', name: '速溶咖啡', category: '速溶', caffeineContent: 62, defaultVolume: 240, isPreset: true },
  { id: 'preset-nescafe-gold', name: '雀巢 金牌', category: '速溶', caffeineContent: 40, defaultVolume: 150, isPreset: true },

  // --- 其他 (Other) ---
  { id: 'preset-cola', name: '可乐', category: '其他', caffeineContent: 10, defaultVolume: 330, isPreset: true },
  { id: 'preset-energy', name: '能量饮料', category: '其他', caffeineContent: 32, defaultVolume: 250, isPreset: true },
  { id: 'preset-dark-chocolate', name: '黑巧克力(100g)', category: '其他', caffeineContent: 43, defaultVolume: 100, isPreset: true }, // 注意：单位不一致
];

// 存储原始预设ID用于参考（例如，用于删除逻辑）
export const originalPresetDrinkIds = new Set(initialPresetDrinks.map(d => d.id));