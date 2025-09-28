import React, { useState, useMemo } from 'react';
import { Search, Filter, Coffee, CupSoda, Leaf, Star, Droplet, Sun, X, Beer, Wine, Milk } from 'lucide-react';
import { getPresetIconColor } from '../utils/constants';

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
    const color = drink.isPreset
      ? (drink.iconColor || getPresetIconColor(drink.id, category))
      : colors.customDrinkText;
    const iconProps = {
      size: 18,
      className: 'mb-1 transition-colors',
      style: { color: color || colors.textSecondary },
    };

    switch (category) {
      case '手工咖啡':
      case '连锁品牌':
      case '精品咖啡':
      case '速溶咖啡':
        return <Coffee {...iconProps} />;

      case '瓶装茶饮':
        return <Leaf {...iconProps} />;

      case '碳酸饮料':
        return <CupSoda {...iconProps} />;

      case '功能饮料':
        return <Sun {...iconProps} />;

      default:
        if (nameLower.includes('巧克力')) return <Star {...iconProps} />;
        if (nameLower.includes('咖啡')) return <Coffee {...iconProps} />;
        if (nameLower.includes('茶')) return <Leaf {...iconProps} />;
        if (nameLower.includes('可乐') || nameLower.includes('苏打')) return <CupSoda {...iconProps} />;
        if (nameLower.includes('酒') || nameLower.includes('wine')) return <Wine {...iconProps} />;
        if (nameLower.includes('啤酒') || nameLower.includes('beer')) return <Beer {...iconProps} />;
        if (nameLower.includes('奶') || nameLower.includes('milk')) return <Milk {...iconProps} />;
        return <Droplet {...iconProps} />;
    }
  };

  return (
    <div className="mb-4 border rounded-lg p-4 transition-colors overflow-x-hidden" style={{
      borderColor: colors.borderSubtle,
      backgroundColor: colors.bgCard
    }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium transition-colors flex items-center" style={{ color: colors.textSecondary }}>
          <Coffee size={14} className="mr-2" />
          选择饮品
        </h3>
        {selectedDrinkId && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{
            backgroundColor: colors.accent + '20',
            color: colors.accent
          }}>
            已选择
          </span>
        )}
      </div>

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
          <Search size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 transition-colors"
            style={{ color: searchTerm ? colors.accent : colors.textMuted }} />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X size={12} style={{ color: colors.textMuted }} />
            </button>
          )}
        </div>
        {/* 分类过滤器 */}
        <div className="relative flex-shrink-0">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full sm:w-auto p-2 pl-8 pr-6 border rounded-md focus:outline-none focus:ring-1 text-sm appearance-none transition-colors"
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
          <Filter size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none transition-colors"
            style={{ color: filterCategory === 'all' ? colors.textMuted : colors.accent }} />
        </div>
      </div>

      {/* 饮品网格 - 修改布局使其更紧凑且防止横向滚动 */}
      <div className="max-h-60 overflow-y-auto overflow-x-hidden space-y-3 pr-1 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-rounded-full transition-colors"
        style={{
          scrollbarColor: `${colors.borderStrong} transparent`,
        }}>
        {groupedDrinks.length > 0 ? groupedDrinks.map(({ category, items }) => (
          <div key={category} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium transition-colors flex items-center" style={{ color: colors.textSecondary }}>
                <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: colors.accent }}></div>
                {category}
              </h4>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{
                backgroundColor: colors.bgBase,
                color: colors.textMuted,
                border: `1px solid ${colors.borderSubtle}`
              }}>
                {items.length}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-1 sm:gap-2">
              {items.map(drink => (
                <button
                  key={drink.id}
                  onClick={() => onSelectDrink(drink.id)}
                  className={`p-1.5 sm:p-2 border rounded-lg text-center text-xs font-medium transition-all duration-200 
                              focus:outline-none focus:ring-1 flex flex-col items-center justify-between min-h-[72px] 
                              shadow-sm hover:shadow-md hover:scale-105 active:scale-95 relative group`}
                  style={{
                    backgroundColor: selectedDrinkId === drink.id
                      ? colors.accent + "20" // 选中状态
                      : drink.isPreset
                        ? colors.bgBase // 预设饮品
                        : colors.customDrinkBg, // 自定义饮品
                    color: selectedDrinkId === drink.id
                      ? colors.accent
                      : drink.isPreset
                        ? colors.textPrimary
                        : colors.customDrinkText,
                    borderColor: selectedDrinkId === drink.id
                      ? colors.accent
                      : drink.isPreset
                        ? colors.borderSubtle
                        : colors.customDrinkBorder,
                    borderWidth: selectedDrinkId === drink.id ? '2px' : '1px',
                  }}
                  title={`${drink.name} (${drink.calculationMode === 'perGram'
                      ? `${drink.caffeinePerGram}mg/g`
                      : `${drink.caffeineContent}mg/100ml`
                    }${drink.defaultVolume ? `, ${drink.defaultVolume}${drink.calculationMode === 'perGram' ? 'g' : 'ml'}` : ''})`}
                >
                  <div className="mb-1 transition-transform duration-200 group-hover:scale-110 flex-shrink-0">
                    {getDrinkIcon(drink)}
                  </div>
                  <span className="leading-tight line-clamp-2 px-0.5 w-full text-[10px] sm:text-xs">{drink.name}</span>
                  <div className="text-[9px] sm:text-xs opacity-60 mt-0.5">
                    {drink.calculationMode === 'perGram'
                      ? `${drink.caffeinePerGram}mg/g`
                      : `${drink.caffeineContent}mg/100ml`}
                  </div>
                  {selectedDrinkId === drink.id && (
                    <div
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: colors.accent }}
                    >
                      <div
                        className="w-full h-full rounded-full animate-ping"
                        style={{ backgroundColor: colors.accent }}
                      ></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )) : (
          <div className="text-center py-6">
            <Search size={24} className="mx-auto mb-2 opacity-30" style={{ color: colors.textMuted }} />
            <p className="text-sm transition-colors" style={{ color: colors.textMuted }}>
              没有找到匹配的饮品
            </p>
          </div>
        )}
      </div>

      {/* 清除选择按钮 - 增强设计 */}
      {selectedDrinkId && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: colors.borderSubtle }}>
          <button
            onClick={onClearSelection}
            className="w-full py-2 px-3 text-sm border rounded-lg transition-all duration-200 flex items-center justify-center hover:shadow-md transform hover:scale-[1.01] active:scale-[0.99]"
            style={{
              borderColor: colors.borderSubtle,
              color: colors.textSecondary,
              backgroundColor: colors.bgBase
            }}
          >
            <X size={16} className="mr-2" /> 清除选择 (手动输入)
          </button>
        </div>
      )}
    </div>
  );
};

export default DrinkSelector;
