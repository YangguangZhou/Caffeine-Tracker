import React, { useState, useMemo } from 'react';
import { Search, Filter, Coffee, CupSoda, Leaf, Star, Droplet, Sun, X, Beer, Wine, Milk } from 'lucide-react';

/**
 * 饮品选择器组件
 * 用于显示饮品列表并允许选择
 * 
 * @param {Object} props - 组件属性
 * @param {Array} props.drinks - 饮品列表
 * @param {string} props.selectedDrinkId - 当前选中的饮品ID
 * @param {function} props.onSelectDrink - 选中饮品时的回调
 * @param {function} props.onClearSelection - 清除选择的回调
 * @param {string} props.DEFAULT_CATEGORY - 默认分类
 * @param {Array} props.DRINK_CATEGORIES - 饮品分类列表
 * @param {Object} props.colors - 颜色主题
 */
const DrinkSelector = ({
  drinks,
  selectedDrinkId,
  onSelectDrink,
  onClearSelection,
  DEFAULT_CATEGORY = '其他',
  DRINK_CATEGORIES = ['通用', '连锁咖啡', '茶饮', '速溶', '其他'],
  colors
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all'); // 'all', '通用', '连锁咖啡', etc.

  // 缓存分类列表，避免在每次渲染时重新计算
  const categories = useMemo(() => {
    const existingCats = new Set(drinks.map(d => d.category || DEFAULT_CATEGORY));
    const allCats = new Set([...DRINK_CATEGORIES, ...existingCats]);
    return ['all', ...Array.from(allCats).sort((a, b) => {
      const aIndex = DRINK_CATEGORIES.indexOf(a);
      const bIndex = DRINK_CATEGORIES.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    })];
  }, [drinks, DRINK_CATEGORIES, DEFAULT_CATEGORY]);

  // 缓存过滤后的饮品
  const filteredDrinks = useMemo(() => {
    return drinks.filter(drink => {
      const nameMatch = drink.name.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = filterCategory === 'all' || (drink.category || DEFAULT_CATEGORY) === filterCategory;
      return nameMatch && categoryMatch;
    });
  }, [drinks, searchTerm, filterCategory, DEFAULT_CATEGORY]);

  // 按分类对饮品进行分组
  const groupedDrinks = useMemo(() => {
    const groups = {};
    filteredDrinks.forEach(drink => {
      const category = drink.category || DEFAULT_CATEGORY;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(drink);
    });

    // 对每个分组内的饮品进行排序：自定义优先，然后是预设，最后按字母顺序
    Object.values(groups).forEach(items => {
      items.sort((a, b) => {
        if (!a.isPreset && b.isPreset) return -1; // 自定义在前
        if (a.isPreset && !b.isPreset) return 1;  // 预设在后
        return a.name.localeCompare(b.name);      // 按字母顺序
      });
    });

    // 按照DRINK_CATEGORIES的顺序对分类进行排序
    const orderedCategories = Object.keys(groups).sort((a, b) => {
      const aIndex = DRINK_CATEGORIES.indexOf(a);
      const bIndex = DRINK_CATEGORIES.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    return orderedCategories.map(category => ({ category, items: groups[category] }));
  }, [filteredDrinks, DRINK_CATEGORIES, DEFAULT_CATEGORY]);

  // 根据分类或名称关键词获取图标
  const getDrinkIcon = (drink) => {
    const nameLower = drink.name.toLowerCase();
    const category = drink.category || DEFAULT_CATEGORY;

    // 根据分类选择图标
    switch (category) {
      case '手工咖啡':
        if (nameLower.includes('拿铁') || nameLower.includes('卡布奇诺'))
          return <Coffee size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-orange-600' : colors.customDrinkText}`} />;
        return <Coffee size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-amber-800' : colors.customDrinkText}`} />;

      case '连锁品牌':
      case '精品咖啡':
        if (nameLower.includes('拿铁'))
          return <Coffee size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-orange-500' : colors.customDrinkText}`} />;
        return <Coffee size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-amber-700' : colors.customDrinkText}`} />;

      case '瓶装茶饮':
        return <Leaf size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-green-600' : colors.customDrinkText}`} />;

      case '速溶咖啡':
        return <Coffee size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-amber-600' : colors.customDrinkText}`} />;

      case '碳酸饮料':
        return <CupSoda size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-blue-500' : colors.customDrinkText}`} />;

      case '功能饮料':
        return <Sun size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-yellow-500' : colors.customDrinkText}`} />;

      default:
        // 其他根据名称选择图标
        if (nameLower.includes('巧克力'))
          return <Star size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-yellow-900' : colors.customDrinkText}`} />;
        if (nameLower.includes('咖啡'))
          return <Coffee size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-gray-700' : colors.customDrinkText}`} />;
        if (nameLower.includes('茶'))
          return <Leaf size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-green-700' : colors.customDrinkText}`} />;
        if (nameLower.includes('可乐') || nameLower.includes('苏打'))
          return <CupSoda size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-blue-600' : colors.customDrinkText}`} />;
        if (nameLower.includes('酒') || nameLower.includes('wine'))
          return <Wine size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-red-600' : colors.customDrinkText}`} />;
        if (nameLower.includes('啤酒') || nameLower.includes('beer'))
          return <Beer size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-amber-500' : colors.customDrinkText}`} />;
        if (nameLower.includes('奶') || nameLower.includes('milk'))
          return <Milk size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-slate-300' : colors.customDrinkText}`} />;
        return <Droplet size={18} className={`mb-1 transition-colors ${drink.isPreset ? 'text-gray-500' : colors.customDrinkText}`} />;
    }
  };

  return (
    <div className="mb-4 border rounded-lg p-3 transition-colors" style={{
      borderColor: colors.borderSubtle,
      backgroundColor: `${colors.bgCard}80` // 添加透明度
    }}>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        {/* 搜索输入框 */}
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="搜索饮品..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-8 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
            style={{
              backgroundColor: colors.bgBase,
              color: colors.textPrimary,
              borderColor: colors.borderStrong,
            }}
          />
          <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        {/* 分类过滤器 */}
        <div className="relative flex-shrink-0">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full sm:w-auto p-2 pl-8 border rounded-md focus:outline-none focus:ring-1 text-sm appearance-none transition-colors"
            style={{
              backgroundColor: colors.bgBase,
              color: colors.textPrimary,
              borderColor: colors.borderStrong,
            }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat} style={{
                backgroundColor: colors.bgBase,
                color: colors.textPrimary
              }}>
                {cat === 'all' ? '所有分类' : cat}
              </option>
            ))}
          </select>
          <Filter size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* 饮品网格 */}
      <div className="max-h-60 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-rounded-full transition-colors"
        style={{
          scrollbarColor: `${colors.borderStrong} transparent`,
        }}>
        {groupedDrinks.length > 0 ? groupedDrinks.map(({ category, items }) => (
          <div key={category}>
            <h4 className="text-sm font-semibold mb-1.5 transition-colors" style={{ color: colors.textSecondary }}>{category}</h4>
            <div className="grid grid-cols-3 gap-2">
              {items.map(drink => (
                <button
                  key={drink.id}
                  onClick={() => onSelectDrink(drink.id)}
                  className={`p-2 border rounded-lg text-center text-xs font-medium transition-all duration-150 
                              focus:outline-none focus:ring-2 focus:ring-offset-1 flex flex-col items-center justify-center h-20 
                              shadow-sm hover:shadow-md`}
                  style={{
                    backgroundColor: selectedDrinkId === drink.id
                      ? colors.accent + "40" // 选中状态
                      : drink.isPreset
                        ? colors.bgBase // 预设饮品
                        : colors.customDrinkBg, // 自定义饮品
                    color: selectedDrinkId === drink.id
                      ? colors.textPrimary
                      : drink.isPreset
                        ? colors.textPrimary
                        : colors.customDrinkText,
                    borderColor: selectedDrinkId === drink.id
                      ? colors.accent
                      : drink.isPreset
                        ? colors.borderSubtle
                        : colors.customDrinkBorder,
                    boxShadow: selectedDrinkId === drink.id
                      ? `0 0 0 2px ${colors.accent}40`
                      : 'none',
                  }}
                  title={`${drink.name} (${drink.caffeineContent}mg/100ml${drink.defaultVolume ? `, ${drink.defaultVolume}ml` : ''})`}
                >
                  {getDrinkIcon(drink)}
                  <span className="leading-tight line-clamp-2">{drink.name}</span>
                </button>
              ))}
            </div>
          </div>
        )) : (
          <p className="text-center py-4 text-sm transition-colors" style={{ color: colors.textMuted }}>
            没有找到匹配的饮品。
          </p>
        )}
      </div>

      {/* 清除选择按钮 */}
      {selectedDrinkId && (
        <button
          onClick={onClearSelection}
          className="mt-3 w-full py-1.5 px-3 text-xs border rounded-md transition-colors duration-200 flex items-center justify-center"
          style={{
            borderColor: colors.borderSubtle,
            color: colors.textSecondary,
            backgroundColor: `${colors.bgBase}80`
          }}
        >
          <X size={14} className="mr-1" /> 清除选择 (手动输入)
        </button>
      )}
    </div>
  );
};

export default DrinkSelector;