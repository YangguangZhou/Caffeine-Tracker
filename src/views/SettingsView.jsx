import React, { useState, useCallback } from 'react'; // 添加 useCallback
// 导入 Helmet 用于设置页面头部信息
import { Helmet } from 'react-helmet-async';
import {
    User, Weight, Target, Sliders, Clock, Moon,
    Droplet, Coffee, Plus, X, Save, Edit, Trash2,
    Download, Upload, RotateCcw, HelpCircle, Tag,
    CloudDownload, Server, Lock, Activity, TestTubeDiagonal, Database // 添加 Database 图标
} from 'lucide-react';
import { formatDatetimeLocal } from '../utils/timeUtils';
import { initialPresetDrinks, DRINK_CATEGORIES, DEFAULT_CATEGORY } from '../utils/constants';
// 动态导入 WebDAVClient
const WebDAVClientPromise = import('../utils/webdavSync');

/**
 * 设置视图组件
 * 包含个人设置、代谢设置、饮品管理和数据管理
 */
const SettingsView = ({
    userSettings,
    onUpdateSettings,
    drinks,
    setDrinks,
    originalPresetDrinkIds,
    onManualSync,
    syncStatus,
    records,
    setRecords,
    colors
}) => {
    // 饮品编辑状态 (保持不变)
    const [showDrinkEditor, setShowDrinkEditor] = useState(false);
    const [editingDrink, setEditingDrink] = useState(null);
    const [newDrinkName, setNewDrinkName] = useState('');
    const [newDrinkCaffeine, setNewDrinkCaffeine] = useState('');
    const [newDrinkVolume, setNewDrinkVolume] = useState('');
    const [newDrinkCategory, setNewDrinkCategory] = useState(DEFAULT_CATEGORY);

    // WebDAV测试状态 (保持不变)
    const [testingWebDAV, setTestingWebDAV] = useState(false);
    const [webDAVTestResult, setWebDAVTestResult] = useState(null);

    // 处理设置变更 (保持不变)
    const handleSettingChange = useCallback((key, value) => {
        onUpdateSettings({ [key]: value });
    }, [onUpdateSettings]);

    // 验证数值输入范围 (保持不变)
    const validateNumericSetting = useCallback((key, value, min, max, defaultValue) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < min || numValue > max) {
            onUpdateSettings({ [key]: defaultValue });
        }
    }, [onUpdateSettings]);

    // 重置饮品表单 (保持不变)
    const resetDrinkForm = useCallback(() => {
        setShowDrinkEditor(false);
        setEditingDrink(null);
        setNewDrinkName('');
        setNewDrinkCaffeine('');
        setNewDrinkVolume('');
        setNewDrinkCategory(DEFAULT_CATEGORY);
    }, []);

    // 处理添加/更新饮品 (使用 useCallback)
    const handleAddOrUpdateDrink = useCallback(() => {
        const name = newDrinkName.trim();
        const caffeine = parseFloat(newDrinkCaffeine);
        const volume = newDrinkVolume.trim() === '' ? null : parseFloat(newDrinkVolume);
        const category = newDrinkCategory || DEFAULT_CATEGORY;

        if (!name || isNaN(caffeine) || caffeine < 0) {
            alert("请输入有效的饮品名称和非负的咖啡因含量 (mg/100ml)。");
            return;
        }
        if (volume !== null && (isNaN(volume) || volume <= 0)) {
            alert("默认容量必须是大于 0 的数字，或留空。");
            return;
        }
        const existingDrink = drinks.find(drink =>
            drink.name.toLowerCase() === name.toLowerCase() &&
            drink.id !== editingDrink?.id
        );
        if (existingDrink) {
            alert(`名称为 "${name}" 的饮品已存在。请使用不同的名称。`);
            return;
        }

        const newDrinkData = {
            id: editingDrink?.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: name,
            caffeineContent: caffeine,
            defaultVolume: volume,
            category: category,
            isPreset: editingDrink?.isPreset ?? false,
        };

        if (editingDrink) {
            setDrinks(prevDrinks => prevDrinks.map(drink => drink.id === editingDrink.id ? newDrinkData : drink));
        } else {
            setDrinks(prevDrinks => [...prevDrinks, newDrinkData]);
        }
        resetDrinkForm();
    }, [newDrinkName, newDrinkCaffeine, newDrinkVolume, newDrinkCategory, editingDrink, drinks, setDrinks, resetDrinkForm]);

    // 删除饮品 (使用 useCallback)
    const deleteDrink = useCallback((id) => {
        const drinkToDelete = drinks.find(drink => drink.id === id);
        if (!drinkToDelete) return;
        if (originalPresetDrinkIds.has(id)) {
            alert("无法删除原始预设饮品。您可以编辑它或添加新的自定义饮品。");
            return;
        }
        if (window.confirm(`确定要删除饮品 "${drinkToDelete.name}" 吗？`)) {
            setDrinks(prevDrinks => prevDrinks.filter(drink => drink.id !== id));
        }
    }, [drinks, setDrinks, originalPresetDrinkIds]);

    // 编辑饮品 (使用 useCallback)
    const editDrink = useCallback((drink) => {
        setEditingDrink(drink);
        setNewDrinkName(drink.name);
        setNewDrinkCaffeine(drink.caffeineContent.toString());
        setNewDrinkVolume(drink.defaultVolume?.toString() ?? '');
        setNewDrinkCategory(drink.category || DEFAULT_CATEGORY);
        setShowDrinkEditor(true);
    }, []);

    // 测试WebDAV连接 (使用 useCallback)
    const testWebDAVConnection = useCallback(async () => {
        setTestingWebDAV(true);
        setWebDAVTestResult(null);
        try {
            const WebDAVClientModule = await WebDAVClientPromise; // 等待 Promise 解析
            const WebDAVClient = WebDAVClientModule.default;
            if (!WebDAVClient) throw new Error("无法加载WebDAV客户端。");

            const client = new WebDAVClient(
                userSettings.webdavServer,
                userSettings.webdavUsername,
                userSettings.webdavPassword
            );
            const result = await client.testConnection();
            setWebDAVTestResult(result);
        } catch (error) {
            console.error("测试WebDAV连接时出错:", error);
            setWebDAVTestResult({ success: false, message: `连接错误: ${error.message}` });
        } finally {
            setTestingWebDAV(false);
        }
    }, [userSettings.webdavServer, userSettings.webdavUsername, userSettings.webdavPassword]);

    // 导出数据 (使用 useCallback)
    const exportData = useCallback(() => {
        try {
            const exportData = {
                records,
                userSettings,
                drinks,
                exportTimestamp: Date.now(),
                version: '1.0.3'
            };
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
            const exportFileDefaultName = `caffeine-tracker-data-${new Date().toISOString().slice(0, 10)}.json`;
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            document.body.appendChild(linkElement);
            linkElement.click();
            document.body.removeChild(linkElement);
        } catch (error) {
            console.error("导出数据失败:", error);
            alert("导出数据时发生错误。");
        }
    }, [records, userSettings, drinks]);

    // 导入数据 (使用 useCallback)
    const importData = useCallback((event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data && Array.isArray(data.records) && typeof data.userSettings === 'object' && data.userSettings !== null && Array.isArray(data.drinks)) {
                    if (data.drinks.length > 0) {
                        const firstDrink = data.drinks[0];
                        if (!firstDrink || typeof firstDrink.id === 'undefined' || typeof firstDrink.name === 'undefined' || typeof firstDrink.caffeineContent === 'undefined') {
                            throw new Error("饮品列表格式不正确。");
                        }
                    }
                    if (window.confirm('导入数据将覆盖当前所有记录、设置和饮品列表。确定要继续吗？')) {
                        const importedSettings = { ...defaultSettings }; // 从默认设置开始，防止导入不兼容的旧设置
                        for (const key in defaultSettings) { // 遍历 *默认* 设置的键
                            if (data.userSettings.hasOwnProperty(key) && typeof data.userSettings[key] === typeof defaultSettings[key]) {
                                // 特殊处理布尔值 develop
                                if (key === 'develop' && typeof data.userSettings[key] !== 'boolean') {
                                    importedSettings[key] = defaultSettings[key]; // 使用默认值
                                } else {
                                    importedSettings[key] = data.userSettings[key];
                                }
                            }
                        }
                         // 确保同步相关设置也被导入（如果存在且类型匹配）
                         ['webdavEnabled', 'webdavServer', 'webdavUsername', 'webdavPassword', 'webdavSyncFrequency'].forEach(key => {
                            if (data.userSettings.hasOwnProperty(key) && typeof data.userSettings[key] === typeof defaultSettings[key]) {
                                importedSettings[key] = data.userSettings[key];
                            }
                        });
                        // 不要导入 lastSyncTimestamp
                        importedSettings.lastSyncTimestamp = userSettings.lastSyncTimestamp;


                        const validatedDrinks = data.drinks.map(d => ({
                            id: d.id || `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                            name: d.name || '未知饮品',
                            caffeineContent: typeof d.caffeineContent === 'number' ? d.caffeineContent : 0,
                            defaultVolume: typeof d.defaultVolume === 'number' ? d.defaultVolume : null,
                            category: DRINK_CATEGORIES.includes(d.category) ? d.category : DEFAULT_CATEGORY,
                            isPreset: d.isPreset === true,
                        }));

                        setRecords(data.records.sort((a, b) => b.timestamp - a.timestamp));
                        onUpdateSettings(importedSettings);
                        setDrinks(validatedDrinks);
                        alert('数据导入成功！');
                    }
                } else {
                    alert('导入失败：数据格式不正确或缺少必要部分 (需要 records, userSettings, drinks)。');
                }
            } catch (error) {
                alert(`导入失败：无法解析文件或文件格式错误。错误: ${error.message}`);
                console.error('导入错误:', error);
            } finally {
                event.target.value = null;
            }
        };
        reader.onerror = () => {
            alert('读取文件时出错。');
            console.error('File reading error:', reader.error);
            event.target.value = null;
        };
        reader.readAsText(file);
    }, [setRecords, onUpdateSettings, setDrinks, userSettings.lastSyncTimestamp]); // 添加依赖

    // 清除所有数据 (使用 useCallback)
    const clearAllData = useCallback(() => {
        if (window.confirm('警告：确定要清除所有本地存储的数据吗？此操作无法撤销！')) {
            setRecords([]);
            onUpdateSettings({ ...defaultSettings, lastSyncTimestamp: null }); // 重置为默认设置
            setDrinks([...initialPresetDrinks]);
            localStorage.removeItem('caffeineRecords');
            localStorage.removeItem('caffeineSettings');
            localStorage.removeItem('caffeineDrinks');
            alert('所有本地数据已清除！');
        }
    }, [setRecords, onUpdateSettings, setDrinks]);

    return (
        <>
            {/* SEO: 设置此视图特定的 Title 和 Description */}
            <Helmet>
                <title>设置 - 咖啡因追踪器</title>
                <meta name="description" content="配置您的个人参数、代谢与睡眠设置、管理饮品列表以及进行数据同步和管理。" />
            </Helmet>

            {/* 使用 section 语义标签包裹每个设置区域 */}
            <section
                aria-labelledby="personal-settings-heading"
                className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
                style={{
                    backgroundColor: colors.bgCard,
                    borderColor: colors.borderSubtle
                }}
            >
                <h2
                    id="personal-settings-heading"
                    className="text-xl font-semibold mb-4 flex items-center transition-colors"
                    style={{ color: colors.espresso }}
                >
                    <User size={20} className="mr-2" aria-hidden="true" /> 个人参数
                </h2>
                <div className="space-y-4">
                    {/* 体重 */}
                    <div>
                        <label
                            htmlFor="userWeight"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Weight size={14} className="inline mr-1" aria-hidden="true" />体重 (kg):
                        </label>
                        <input
                            id="userWeight"
                            type="number"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.weight}
                            onChange={(e) => handleSettingChange('weight', e.target.value === '' ? '' : parseInt(e.target.value))}
                            onBlur={(e) => validateNumericSetting('weight', e.target.value, 20, 300, 60)}
                            min="20"
                            max="300"
                            placeholder="60"
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            用于计算个性化推荐摄入量和估算浓度。
                        </p>
                    </div>

                    {/* 通用每日最大摄入量 */}
                    <div>
                        <label
                            htmlFor="maxDailyCaffeine"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Target size={14} className="inline mr-1" aria-hidden="true" />通用每日最大摄入量 (mg):
                        </label>
                        <input
                            id="maxDailyCaffeine"
                            type="number"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.maxDailyCaffeine}
                            onChange={(e) => handleSettingChange('maxDailyCaffeine', e.target.value === '' ? '' : parseInt(e.target.value))}
                            onBlur={(e) => validateNumericSetting('maxDailyCaffeine', e.target.value, 0, 2000, 400)}
                            min="0"
                            max="2000"
                            placeholder="400"
                        />
                        <div
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            通用指南上限 (如 400mg)。设为 0 将使用默认值 400。
                        </div>
                    </div>

                    {/* 个性化推荐剂量 */}
                    <div>
                        <label
                            htmlFor="recommendedDosePerKg"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Target size={14} className="inline mr-1" aria-hidden="true" />个性化推荐剂量 (mg/kg):
                        </label>
                        <input
                            id="recommendedDosePerKg"
                            type="number"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.recommendedDosePerKg}
                            onChange={(e) => handleSettingChange('recommendedDosePerKg', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            onBlur={(e) => validateNumericSetting('recommendedDosePerKg', e.target.value, 1, 10, 5)}
                            min="1"
                            max="10"
                            step="0.5"
                            placeholder="5"
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            建议范围 3-6 mg/kg。应用将取此计算值与通用上限中的较低者作为您的有效上限。
                        </p>
                    </div>
                </div>
            </section>

            <section
                aria-labelledby="metabolism-settings-heading"
                className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
                style={{
                    backgroundColor: colors.bgCard,
                    borderColor: colors.borderSubtle
                }}
            >
                <h2
                    id="metabolism-settings-heading"
                    className="text-xl font-semibold mb-4 flex items-center transition-colors"
                    style={{ color: colors.espresso }}
                >
                    <Sliders size={20} className="mr-2" aria-hidden="true" /> 代谢与睡眠设置
                </h2>
                <div className="space-y-4">
                    {/* 咖啡因半衰期 */}
                    <div>
                        <label
                            htmlFor="caffeineHalfLife"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Clock size={14} className="inline mr-1" aria-hidden="true" />咖啡因半衰期 (小时):
                        </label>
                        <input
                            id="caffeineHalfLife"
                            type="number"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.caffeineHalfLifeHours}
                            onChange={(e) => handleSettingChange('caffeineHalfLifeHours', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            onBlur={(e) => validateNumericSetting('caffeineHalfLifeHours', e.target.value, 1, 24, 4)}
                            min="1"
                            max="24"
                            step="0.5"
                            placeholder="4"
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            影响体内咖啡因代谢速度估算，平均为 4 小时，个体差异大 (1.5-9.5h)。
                        </p>
                    </div>

                    {/* 分布容积 */}
                    <div>
                        <label
                            htmlFor="volumeOfDistribution"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Droplet size={14} className="inline mr-1" aria-hidden="true" />分布容积 (L/kg):
                        </label>
                        <input
                            id="volumeOfDistribution"
                            type="number"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.volumeOfDistribution}
                            onChange={(e) => handleSettingChange('volumeOfDistribution', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            onBlur={(e) => validateNumericSetting('volumeOfDistribution', e.target.value, 0.1, 1.5, 0.6)}
                            min="0.1"
                            max="1.5"
                            step="0.1"
                            placeholder="0.6"
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            用于估算浓度，典型值约为 0.6 L/kg。
                        </p>
                    </div>

                    {/* 睡前安全浓度阈值 */}
                    <div>
                        <label
                            htmlFor="safeSleepThresholdConcentration"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Moon size={14} className="inline mr-1" aria-hidden="true" />睡前安全浓度阈值 (mg/L):
                        </label>
                        <input
                            id="safeSleepThresholdConcentration"
                            type="number"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.safeSleepThresholdConcentration}
                            onChange={(e) => handleSettingChange('safeSleepThresholdConcentration', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            onBlur={(e) => validateNumericSetting('safeSleepThresholdConcentration', e.target.value, 0, 10, 1.5)}
                            min="0"
                            max="10"
                            step="0.1"
                            placeholder="1.5"
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            当体内咖啡因浓度低于此值时，对睡眠影响较小（估算）。建议 1.5 mg/L 左右，敏感者可降低。
                        </p>
                    </div>

                    {/* 计划睡眠时间 */}
                    <div>
                        <label
                            htmlFor="plannedSleepTime"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Moon size={14} className="inline mr-1" aria-hidden="true" />计划睡眠时间:
                        </label>
                        <input
                            id="plannedSleepTime"
                            type="time"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.plannedSleepTime}
                            onChange={(e) => handleSettingChange('plannedSleepTime', e.target.value || '22:00')}
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            用于提供更个性化的睡眠建议。
                        </p>
                    </div>
                </div>
            </section>

            <section
                aria-labelledby="webdav-settings-heading"
                className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
                style={{
                    backgroundColor: colors.bgCard,
                    borderColor: colors.borderSubtle
                }}
            >
                <h2
                    id="webdav-settings-heading"
                    className="text-xl font-semibold mb-4 flex items-center transition-colors"
                    style={{ color: colors.espresso }}
                >
                    <CloudDownload size={20} className="mr-2" aria-hidden="true" /> WebDAV 同步
                </h2>
                <div className="space-y-4">
                    {/* 启用WebDAV */}
                    <div className="flex items-center">
                        <input
                            id="webdavEnabled"
                            type="checkbox"
                            className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={userSettings.webdavEnabled}
                            onChange={(e) => handleSettingChange('webdavEnabled', e.target.checked)}
                        />
                        <label
                            htmlFor="webdavEnabled"
                            className="font-medium transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            启用WebDAV同步
                        </label>
                    </div>

                    {/* 服务器地址 */}
                    <div>
                        <label
                            htmlFor="webdavServer"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Server size={14} className="inline mr-1" aria-hidden="true" /> WebDAV服务器地址:
                        </label>
                        <input
                            id="webdavServer"
                            type="text" // 保持 text 类型，URL 可能很长
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors disabled:opacity-50 disabled:bg-gray-100"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.webdavServer || ''}
                            onChange={(e) => handleSettingChange('webdavServer', e.target.value)}
                            placeholder="https://example.com/webdav/"
                            disabled={!userSettings.webdavEnabled}
                            autoComplete="off" // 避免浏览器自动填充
                        />
                         <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            输入完整的WebDAV服务器URL。
                        </p>
                    </div>

                    {/* 用户名 */}
                    <div>
                        <label
                            htmlFor="webdavUsername"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <User size={14} className="inline mr-1" aria-hidden="true" /> WebDAV用户名:
                        </label>
                        <input
                            id="webdavUsername"
                            type="text"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors disabled:opacity-50 disabled:bg-gray-100"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.webdavUsername || ''}
                            onChange={(e) => handleSettingChange('webdavUsername', e.target.value)}
                            placeholder="用户名"
                            disabled={!userSettings.webdavEnabled}
                            autoComplete="username" // 允许浏览器填充用户名
                        />
                    </div>

                    {/* 密码 */}
                    <div>
                        <label
                            htmlFor="webdavPassword"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Lock size={14} className="inline mr-1" aria-hidden="true" /> WebDAV密码:
                        </label>
                        <input
                            id="webdavPassword"
                            type="password"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors disabled:opacity-50 disabled:bg-gray-100"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.webdavPassword || ''}
                            onChange={(e) => handleSettingChange('webdavPassword', e.target.value)}
                            placeholder="密码或应用专用密码"
                            disabled={!userSettings.webdavEnabled}
                            autoComplete="current-password" // 允许浏览器填充密码
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            建议使用应用专用密码。密码将安全地存储在本地。
                        </p>
                    </div>

                    {/* 同步频率 */}
                    <div>
                        <label
                            htmlFor="webdavSyncFrequency"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Activity size={14} className="inline mr-1" aria-hidden="true" /> 同步模式:
                        </label>
                        <select
                            id="webdavSyncFrequency"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm appearance-none transition-colors disabled:opacity-50 disabled:bg-gray-100"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary,
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1.5em 1.5em',
                                paddingRight: '2.5rem',
                            }}
                            value={userSettings.webdavSyncFrequency || 'manual'}
                            onChange={(e) => handleSettingChange('webdavSyncFrequency', e.target.value)}
                            disabled={!userSettings.webdavEnabled}
                        >
                            <option value="manual">手动同步</option>
                            <option value="startup">启动时同步</option>
                        </select>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
                        <button
                            onClick={testWebDAVConnection}
                            className="py-2 px-4 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors duration-200 text-sm shadow flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!userSettings.webdavEnabled || !userSettings.webdavServer || !userSettings.webdavUsername || !userSettings.webdavPassword || testingWebDAV}
                        >
                            <TestTubeDiagonal size={16} className="mr-1.5" aria-hidden="true" />
                            {testingWebDAV ? '测试中...' : '测试连接'}
                        </button>
                        <button
                            onClick={onManualSync}
                            className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200 text-sm shadow flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!userSettings.webdavEnabled || !userSettings.webdavServer || !userSettings.webdavUsername || !userSettings.webdavPassword || syncStatus.inProgress}
                        >
                            <CloudDownload size={16} className="mr-1.5" aria-hidden="true" />
                            {syncStatus.inProgress ? '同步中...' : '立即同步'}
                        </button>
                    </div>

                    {/* 测试结果 */}
                    {webDAVTestResult && (
                        <div className={`p-3 rounded-lg text-sm ${webDAVTestResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {webDAVTestResult.message}
                        </div>
                    )}

                    {/* 同步状态 */}
                    {syncStatus.lastSyncTime && (
                        <p className="text-sm transition-colors" style={{ color: colors.textMuted }}>
                            上次同步: {formatDatetimeLocal(syncStatus.lastSyncTime).replace('T', ' ')}
                            {syncStatus.lastSyncResult && ` (${syncStatus.lastSyncResult.success ? '成功' : '失败'}: ${syncStatus.lastSyncResult.message})`}
                        </p>
                    )}
                     {!syncStatus.lastSyncTime && userSettings.webdavEnabled && (
                        <p className="text-sm transition-colors" style={{ color: colors.textMuted }}>
                           尚未同步过。
                        </p>
                    )}
                </div>
            </section>

            <section
                aria-labelledby="drink-management-heading"
                className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
                style={{
                    backgroundColor: colors.bgCard,
                    borderColor: colors.borderSubtle
                }}
            >
                <h2
                    id="drink-management-heading"
                    className="text-xl font-semibold mb-4 flex items-center transition-colors"
                    style={{ color: colors.espresso }}
                >
                    <Coffee size={20} className="mr-2" aria-hidden="true" /> 饮品管理
                </h2>
                {/* 饮品编辑器/添加按钮 */}
                {showDrinkEditor ? (
                    // 使用 form 标签更符合语义
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleAddOrUpdateDrink(); }} // 阻止默认提交并处理
                        className="mb-4 p-4 border rounded-lg transition-colors"
                        style={{
                            backgroundColor: colors.bgBase,
                            borderColor: colors.borderSubtle
                        }}
                    >
                        <h3
                            className="font-semibold mb-3 text-base transition-colors"
                            style={{ color: colors.espresso }}
                        >
                            {editingDrink ? '编辑饮品' : '添加新饮品'}
                        </h3>

                        {/* 饮品名称 */}
                        <div className="mb-3">
                            <label
                                htmlFor="newDrinkName"
                                className="block mb-1 text-sm font-medium transition-colors"
                                style={{ color: colors.textSecondary }}
                            >
                                饮品名称:
                            </label>
                            <input
                                id="newDrinkName"
                                type="text"
                                className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                                style={{
                                    borderColor: colors.borderStrong,
                                    backgroundColor: colors.bgCard,
                                    color: colors.textPrimary
                                }}
                                value={newDrinkName}
                                onChange={(e) => setNewDrinkName(e.target.value)}
                                placeholder="例如：自制冷萃 (大杯)"
                                required // HTML5 验证
                            />
                        </div>

                        {/* 咖啡因含量 */}
                        <div className="mb-3">
                            <label
                                htmlFor="newDrinkCaffeine"
                                className="block mb-1 text-sm font-medium transition-colors"
                                style={{ color: colors.textSecondary }}
                            >
                                咖啡因含量 (mg/100ml):
                            </label>
                            <input
                                id="newDrinkCaffeine"
                                type="number"
                                className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                                style={{
                                    borderColor: colors.borderStrong,
                                    backgroundColor: colors.bgCard,
                                    color: colors.textPrimary
                                }}
                                value={newDrinkCaffeine}
                                onChange={(e) => setNewDrinkCaffeine(e.target.value)}
                                placeholder="每100ml的咖啡因毫克数"
                                min="0"
                                step="0.1" // 允许小数
                                required // HTML5 验证
                            />
                        </div>

                        {/* 默认容量 */}
                        <div className="mb-3">
                            <label
                                htmlFor="newDrinkVolume"
                                className="block mb-1 text-sm font-medium transition-colors"
                                style={{ color: colors.textSecondary }}
                            >
                                默认容量 (ml, 可选):
                            </label>
                            <input
                                id="newDrinkVolume"
                                type="number"
                                className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                                style={{
                                    borderColor: colors.borderStrong,
                                    backgroundColor: colors.bgCard,
                                    color: colors.textPrimary
                                }}
                                value={newDrinkVolume}
                                onChange={(e) => setNewDrinkVolume(e.target.value)}
                                placeholder="例如: 350 (留空则无默认)"
                                min="1"
                                step="1"
                            />
                        </div>

                        {/* 分类 */}
                        <div className="mb-4">
                            <label
                                htmlFor="newDrinkCategory"
                                className="block mb-1 text-sm font-medium transition-colors"
                                style={{ color: colors.textSecondary }}
                            >
                                分类:
                            </label>
                            <select
                                id="newDrinkCategory"
                                className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm appearance-none transition-colors"
                                style={{
                                    borderColor: colors.borderStrong,
                                    backgroundColor: colors.bgCard,
                                    color: colors.textPrimary,
                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                    backgroundPosition: 'right 0.5rem center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '1.5em 1.5em',
                                    paddingRight: '2.5rem',
                                }}
                                value={newDrinkCategory}
                                onChange={(e) => setNewDrinkCategory(e.target.value)}
                                disabled={editingDrink?.id && originalPresetDrinkIds.has(editingDrink.id)}
                            >
                                {DRINK_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            {editingDrink?.id && originalPresetDrinkIds.has(editingDrink.id) && (
                                <p
                                    className="text-xs mt-1 transition-colors"
                                    style={{ color: colors.textMuted }}
                                >
                                    原始预设饮品的分类不可更改。
                                </p>
                            )}
                        </div>

                        {/* 保存/取消按钮 */}
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                            <button
                                type="submit" // 改为 submit 类型
                                className="flex-1 py-2 px-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 text-sm shadow flex items-center justify-center font-medium"
                            >
                                <Save size={16} className="mr-1.5" aria-hidden="true" /> {editingDrink ? '保存修改' : '添加饮品'}
                            </button>
                            <button
                                type="button" // 改为 button 类型，防止触发表单提交
                                onClick={resetDrinkForm}
                                className="flex-1 py-2 px-3 border rounded-md hover:bg-gray-100 transition-colors duration-200 text-sm flex items-center justify-center font-medium"
                                style={{
                                    borderColor: colors.borderStrong,
                                    color: colors.textSecondary
                                }}
                            >
                                <X size={16} className="mr-1.5" aria-hidden="true" /> 取消
                            </button>
                        </div>
                    </form>
                ) : (
                    <button
                        onClick={() => setShowDrinkEditor(true)}
                        className="w-full py-2.5 mb-4 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center text-sm shadow font-medium"
                    >
                        <Plus size={16} className="mr-1.5" aria-hidden="true" /> 添加自定义饮品
                    </button>
                )}

                {/* 饮品列表 */}
                <div
                    className="divide-y transition-colors"
                    style={{ borderColor: colors.borderSubtle }}
                >
                    <h3
                        className="font-medium mb-2 text-base pt-3 transition-colors"
                        style={{ color: colors.espresso }}
                    >
                        饮品列表:
                    </h3>
                    <p
                        className="text-xs mb-3 flex items-center pt-2 transition-colors"
                        style={{ color: colors.textMuted }}
                    >
                        <HelpCircle size={14} className="mr-1 flex-shrink-0" aria-hidden="true" />
                        品牌饮品数据为公开信息整理或估算值，可能存在误差，仅供参考。您可以编辑这些预设值或添加自定义饮品。
                    </p>
                    <ul
                        className="pt-2 space-y-2 max-h-72 overflow-y-auto text-sm pr-1 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                        style={{ scrollbarColor: `${colors.borderStrong} transparent` }}
                    >
                        {drinks
                            .sort((a, b) => {
                                const catA = a.category || DEFAULT_CATEGORY;
                                const catB = b.category || DEFAULT_CATEGORY;
                                const indexA = DRINK_CATEGORIES.indexOf(catA);
                                const indexB = DRINK_CATEGORIES.indexOf(catB);
                                if (indexA !== indexB) {
                                    if (indexA === -1) return 1; if (indexB === -1) return -1;
                                    return indexA - indexB;
                                }
                                if (!a.isPreset && b.isPreset) return -1; if (a.isPreset && !b.isPreset) return 1;
                                return a.name.localeCompare(b.name);
                            })
                            .map(drink => {
                                const isOriginalPreset = originalPresetDrinkIds.has(drink.id);
                                return (
                                    <li
                                        key={drink.id}
                                        className={`flex justify-between items-center p-3 rounded-lg border transition-colors`}
                                        style={{
                                            backgroundColor: !drink.isPreset ? colors.customDrinkBg : colors.bgBase,
                                            borderColor: !drink.isPreset ? colors.customDrinkBorder : colors.borderSubtle
                                        }}
                                    >
                                        <div className="flex-1 overflow-hidden mr-2">
                                            <p // 使用 p 标签
                                                className="font-medium truncate transition-colors"
                                                style={{
                                                    color: !drink.isPreset ? colors.customDrinkText : colors.espresso
                                                }}
                                                title={drink.name}
                                            >
                                                {drink.name}
                                            </p>
                                            <p // 使用 p 标签
                                                className="text-xs mt-0.5 transition-colors"
                                                style={{
                                                    color: !drink.isPreset ? colors.customDrinkText : colors.textMuted
                                                }}
                                            >
                                                <span className="inline-flex items-center mr-2">
                                                    <Tag size={12} className="mr-0.5" aria-hidden="true" />{drink.category || DEFAULT_CATEGORY}
                                                </span>
                                                <span>{drink.caffeineContent}mg/100ml</span>
                                                {drink.defaultVolume && <span className="ml-1">({drink.defaultVolume}ml)</span>}
                                            </p>
                                        </div>
                                        <div className="flex items-center flex-shrink-0 space-x-1 ml-2">
                                            <button
                                                onClick={() => editDrink(drink)}
                                                className="p-1.5 rounded-full hover:bg-gray-200 transition-colors duration-150"
                                                style={{ color: colors.textSecondary }}
                                                aria-label={`编辑 ${drink.name}`}
                                            >
                                                <Edit size={14} />
                                            </button>
                                            {!isOriginalPreset ? (
                                                <button
                                                    onClick={() => deleteDrink(drink.id)}
                                                    className="p-1.5 text-red-600 rounded-full hover:bg-red-100 transition-colors duration-150"
                                                    aria-label={`删除 ${drink.name}`}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            ) : (
                                                <span
                                                    className="p-1.5 text-gray-400 cursor-not-allowed"
                                                    title="原始预设饮品不可删除"
                                                    aria-label={`无法删除 ${drink.name} (预设)`}
                                                >
                                                    <Trash2 size={14} />
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                    </ul>
                </div>
            </section>

            <section
                aria-labelledby="data-management-heading"
                className="rounded-xl p-6 shadow-lg border transition-colors"
                style={{
                    backgroundColor: colors.bgCard,
                    borderColor: colors.borderSubtle
                }}
            >
                <h2
                    id="data-management-heading"
                    className="text-xl font-semibold mb-4 flex items-center transition-colors"
                    style={{ color: colors.espresso }}
                >
                    <Database size={20} className="mr-2" aria-hidden="true" /> 数据管理
                </h2>
                <div className="space-y-4">
                    {/* 导出数据 */}
                    <div>
                        <h3
                            className="font-medium mb-1 text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            导出数据:
                        </h3>
                        <button
                            onClick={exportData}
                            className="w-full py-2.5 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center shadow text-sm font-medium"
                        >
                            <Download size={16} className="mr-1.5" aria-hidden="true" /> 导出所有数据 (.json)
                        </button>
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            将所有记录、设置和饮品列表导出为 JSON 文件备份。
                        </p>
                    </div>

                    {/* 导入数据 */}
                    <div>
                        <h3
                            className="font-medium mb-1 text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            导入数据:
                        </h3>
                        <label className="w-full py-2.5 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center cursor-pointer shadow text-sm font-medium">
                            <Upload size={16} className="mr-1.5" aria-hidden="true" /> 选择文件导入数据
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={importData}
                                aria-label="选择要导入的 JSON 文件" // A11y: 为隐藏的 input 添加标签
                            />
                        </label>
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            从之前导出的 JSON 文件恢复数据。注意：这将覆盖当前所有数据。
                        </p>
                    </div>

                    {/* 清除数据 */}
                    <div>
                        <h3
                            className="font-medium mb-1 text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            清除数据:
                        </h3>
                        <button
                            onClick={clearAllData}
                            className="w-full py-2.5 px-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 flex items-center justify-center shadow text-sm font-medium"
                        >
                            <RotateCcw size={16} className="mr-1.5" aria-hidden="true" /> 清除所有本地数据
                        </button>
                        <p className="text-xs text-red-500 mt-1">
                            警告：此操作将永久删除所有记录、设置和自定义饮品，并重置为初始预设。
                        </p>
                    </div>
                </div>
            </section>
        </>
    );
};

export default SettingsView;