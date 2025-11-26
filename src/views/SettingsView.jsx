import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    User, Weight, Target, Sliders, Clock, Moon,
    Droplet, Coffee, Plus, X, Save, Edit, Trash2,
    Download, Upload, RotateCcw, HelpCircle, Tag,
    CloudDownload, Server, Lock, Activity, TestTubeDiagonal, Database, Smartphone, Link as LinkIcon, Camera, CheckCircle2, AlertTriangle, Lightbulb, Mail
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { useSearchParams } from 'react-router-dom';
import { formatDatetimeLocal } from '../utils/timeUtils';
import { initialPresetDrinks, DRINK_CATEGORIES, DEFAULT_CATEGORY, defaultSettings, getPresetIconColor } from '../utils/constants';
import SyncConfigShare from '../components/SyncConfigShare';
import ManualImportModal from '../components/ManualImportModal'; // 导入新组件
import { extractConfigParam } from '../utils/syncConfigShare';

// 动态导入 WebDAVClient
const WebDAVClientPromise = import('../utils/webdavSync');

const WEBDAV_PASSWORD_KEY = 'webdavPassword';

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
    colors,
    appConfig,
    isNativePlatform,
    onImportConfig
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    
    // 饮品编辑状态
    const [showDrinkEditor, setShowDrinkEditor] = useState(false);
    const [editingDrink, setEditingDrink] = useState(null);
    const [newDrinkName, setNewDrinkName] = useState('');
    const [newDrinkCaffeineContent, setNewDrinkCaffeineContent] = useState('');
    const [newDrinkCaffeinePerGram, setNewDrinkCaffeinePerGram] = useState('');
    const [newDrinkCalculationMode, setNewDrinkCalculationMode] = useState('per100ml');
    const [newDrinkVolume, setNewDrinkVolume] = useState('');
    const [newDrinkCategory, setNewDrinkCategory] = useState(DEFAULT_CATEGORY);

    // WebDAV测试状态
    const [testingWebDAV, setTestingWebDAV] = useState(false);
    const [webDAVTestResult, setWebDAVTestResult] = useState(null);
    
    // 配置分享状态
    const [showConfigShare, setShowConfigShare] = useState(false);
    const [showManualImport, setShowManualImport] = useState(false); // 新状态
    const [importConfigParam, setImportConfigParam] = useState(''); // 用于存储URL参数中的config
    const [scannedContent, setScannedContent] = useState(''); // 用于存储扫描到的内容

    // 检测URL参数中的config，如果存在则自动打开手动导入弹窗
    useEffect(() => {
        const configParam = searchParams.get('config');
        if (configParam) {
            setImportConfigParam(configParam);
            setShowManualImport(true);
            // 清除URL参数，避免刷新后重复触发
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    // 加载持久化的 WebDAV 密码
    useEffect(() => {
        const loadPersistedPassword = async () => {
            try {
                const { value } = await Preferences.get({ key: WEBDAV_PASSWORD_KEY });
                if (value && value !== userSettings.webdavPassword) {
                    onUpdateSettings('webdavPassword', value, true);
                }
            } catch (error) {
                console.error("加载 WebDAV 密码失败:", error);
            }
        };
        loadPersistedPassword();
    }, []);

    // 处理设置变更
    const handleSettingChange = useCallback(async (key, value) => {
        onUpdateSettings(key, value);
        // 如果更改的是 WebDAV 密码，则持久化存储
        if (key === 'webdavPassword') {
            try {
                if (value) {
                    await Preferences.set({ key: WEBDAV_PASSWORD_KEY, value });
                } else {
                    await Preferences.remove({ key: WEBDAV_PASSWORD_KEY });
                }
            } catch (error) {
                console.error("保存 WebDAV 密码失败:", error);
            }
        }
    }, [onUpdateSettings]);

    // 验证数值输入范围
    const validateNumericSetting = useCallback((key, value, min, max, defaultValue) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < min || numValue > max) {
            onUpdateSettings({ [key]: defaultValue });
        }
    }, [onUpdateSettings]);

    // 重置饮品表单
    const resetDrinkForm = useCallback(() => {
        setShowDrinkEditor(false);
        setEditingDrink(null);
        setNewDrinkName('');
        setNewDrinkCaffeineContent('');
        setNewDrinkCaffeinePerGram('');
        setNewDrinkCalculationMode('per100ml');
        setNewDrinkVolume('');
        setNewDrinkCategory(DEFAULT_CATEGORY); // 确保重置为DEFAULT_CATEGORY
    }, []);

    // 处理添加/更新饮品
    const handleAddOrUpdateDrink = useCallback(() => {
        const name = newDrinkName.trim();
        const volume = newDrinkVolume.trim() === '' ? null : parseFloat(newDrinkVolume);
        const category = newDrinkCategory || DEFAULT_CATEGORY;

        let caffeineContentValue = null;
        let caffeinePerGramValue = null;

        if (newDrinkCalculationMode === 'per100ml') {
            caffeineContentValue = parseFloat(newDrinkCaffeineContent);
            if (isNaN(caffeineContentValue) || caffeineContentValue < 0) {
                alert("每100ml咖啡因含量必须是大于或等于 0 的数字。");
                return;
            }
        } else {
            caffeinePerGramValue = parseFloat(newDrinkCaffeinePerGram);
            if (isNaN(caffeinePerGramValue) || caffeinePerGramValue < 0) {
                alert("每克咖啡豆咖啡因含量必须是大于或等于 0 的数字。");
                return;
            }
        }

        if (name === '') {
            alert("饮品名称不能为空。");
            return;
        }
        if (volume !== null && (isNaN(volume) || volume <= 0)) {
            alert(`默认${newDrinkCalculationMode === 'perGram' ? '用量(g)' : '容量(ml)'}必须是大于 0 的数字，或留空。`);
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

        const isPresetDrink = editingDrink
            ? (editingDrink.isPreset ?? originalPresetDrinkIds.has(editingDrink.id))
            : false;
        const drinkId = editingDrink?.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newDrinkData = {
            id: drinkId,
            name: name,
            calculationMode: newDrinkCalculationMode,
            caffeineContent: caffeineContentValue,
            caffeinePerGram: caffeinePerGramValue,
            defaultVolume: volume,
            category: category,
            isPreset: isPresetDrink,
            updatedAt: Date.now(),
            iconColor: isPresetDrink
                ? (editingDrink?.iconColor || getPresetIconColor(drinkId, category))
                : (editingDrink?.iconColor ?? null),
        };

        if (editingDrink) {
            setDrinks(prevDrinks => prevDrinks.map(drink => drink.id === editingDrink.id ? newDrinkData : drink));
        } else {
            setDrinks(prevDrinks => [...prevDrinks, newDrinkData]);
        }
        resetDrinkForm();
    }, [
        newDrinkName,
        newDrinkCaffeineContent,
        newDrinkCaffeinePerGram,
        newDrinkCalculationMode,
        newDrinkVolume,
        newDrinkCategory,
        editingDrink,
        drinks,
        setDrinks,
        resetDrinkForm,
        originalPresetDrinkIds
    ]);

    // 删除饮品
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

    // 编辑饮品
    const editDrink = useCallback((drink) => {
        setEditingDrink(drink);
        setNewDrinkName(drink.name);
        const mode = drink.calculationMode || 'per100ml';
        setNewDrinkCalculationMode(mode);
        setNewDrinkCaffeineContent(mode === 'per100ml' ? (drink.caffeineContent?.toString() ?? '') : '');
        setNewDrinkCaffeinePerGram(mode === 'perGram' ? (drink.caffeinePerGram?.toString() ?? '') : '');
        setNewDrinkVolume(drink.defaultVolume?.toString() ?? '');
        setNewDrinkCategory(drink.category || DEFAULT_CATEGORY); // 确保使用饮品已有分类或DEFAULT_CATEGORY
        setShowDrinkEditor(true);
    }, []);

    // 测试WebDAV连接
    const testWebDAVConnection = useCallback(async () => {
        console.log("=== 开始WebDAV连接测试 ===");
        setTestingWebDAV(true);
        setWebDAVTestResult(null);

        // 详细的配置检查
        const configCheck = {
            hasServer: !!userSettings.webdavServer,
            hasUsername: !!userSettings.webdavUsername,
            hasPassword: !!userSettings.webdavPassword,
            serverValid: userSettings.webdavServer && userSettings.webdavServer.startsWith('http')
        };

        if (!configCheck.hasServer || !configCheck.hasUsername || !configCheck.hasPassword) {
            const errorMsg = "请确保已填写服务器地址、用户名和密码";
            console.error("WebDAV配置不完整:", configCheck);
            setWebDAVTestResult({
                success: false,
                message: errorMsg
            });
            setTestingWebDAV(false);
            return;
        }

        if (!configCheck.serverValid) {
            const errorMsg = "服务器地址必须以 http:// 或 https:// 开头";
            console.error("服务器地址格式错误:", userSettings.webdavServer);
            setWebDAVTestResult({
                success: false,
                message: errorMsg
            });
            setTestingWebDAV(false);
            return;
        }

        try {
            console.log("开始动态导入WebDAV模块...");
            const WebDAVClientModule = await import('../utils/webdavSync');
            const WebDAVClient = WebDAVClientModule.default;

            if (!WebDAVClient) {
                throw new Error("无法加载WebDAV客户端模块");
            }

            console.log("创建WebDAV客户端实例...");
            const client = new WebDAVClient(
                userSettings.webdavServer,
                userSettings.webdavUsername,
                userSettings.webdavPassword
            );

            // 验证客户端配置
            if (!client.isConfigured()) {
                throw new Error("WebDAV客户端配置无效");
            }

            console.log("开始测试WebDAV连接...", {
                server: userSettings.webdavServer,
                username: userSettings.webdavUsername,
                hasPassword: !!userSettings.webdavPassword,
                platform: isNativePlatform ? 'native' : 'web',
                userAgent: navigator.userAgent.substring(0, 50) + '...'
            });

            const result = await client.testConnection();
            console.log("WebDAV测试结果:", result);
            setWebDAVTestResult(result);

            // 如果连接成功，可以进行额外的检查
            if (result.success) {
                console.log("连接测试成功，WebDAV服务器可用");
            } else {
                console.error("连接测试失败:", result.message);
            }

        } catch (error) {
            console.error("测试WebDAV连接时出现异常:", {
                message: error.message,
                stack: error.stack,
                name: error.name,
                platform: isNativePlatform ? 'native' : 'web',
                configCheck: configCheck
            });

            let errorMessage = `连接错误: ${error.message}`;

            // 根据错误类型提供更有用的提示
            if (error.message.includes('Failed to fetch')) {
                errorMessage += isNativePlatform
                    ? " (请检查网络连接和服务器地址)"
                    : " (请检查网络连接、服务器地址和CORS配置)";
            } else if (error.message.includes('CORS')) {
                errorMessage += " (跨域问题：请在WebDAV服务器配置允许跨域访问)";
            } else if (error.message.includes('SSL') || error.message.includes('certificate')) {
                errorMessage += " (SSL证书问题：请检查HTTPS配置)";
            }

            setWebDAVTestResult({
                success: false,
                message: errorMessage
            });
        } finally {
            setTestingWebDAV(false);
            console.log("=== WebDAV连接测试结束 ===");
        }
    }, [userSettings.webdavServer, userSettings.webdavUsername, userSettings.webdavPassword, isNativePlatform]);

    // 计算按钮是否可用
    const isWebDAVConfigured = useMemo(() => {
        return userSettings.webdavEnabled &&
            userSettings.webdavServer &&
            userSettings.webdavUsername &&
            userSettings.webdavPassword;
    }, [userSettings.webdavEnabled, userSettings.webdavServer, userSettings.webdavUsername, userSettings.webdavPassword]);

    // 导出数据
    const exportData = useCallback(async () => {
        try {
            const settingsToExport = { ...userSettings };

            const exportDataObject = {
                records,
                userSettings: settingsToExport,
                drinks,
                exportTimestamp: Date.now(),
                version: appConfig.latest_version
            };
            const dataStr = JSON.stringify(exportDataObject, null, 2);
            const exportFileDefaultName = `caffeine-tracker-data-${new Date().toISOString().slice(0, 10)}.json`;

            if (isNativePlatform) {
                try {
                    await Filesystem.writeFile({
                        path: exportFileDefaultName,
                        data: dataStr,
                        directory: Directory.Documents,
                        encoding: Encoding.UTF8,
                    });
                    alert(`数据已导出到文档目录: ${exportFileDefaultName}`);
                } catch (e) {
                    console.error('Capacitor 文件保存失败', e);
                    alert(`导出失败: ${e.message}`);
                }
            } else {
                const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                document.body.appendChild(linkElement);
                linkElement.click();
                document.body.removeChild(linkElement);
            }
        } catch (error) {
            console.error("导出数据失败:", error);
            alert("导出数据时发生错误。");
        }
    }, [records, userSettings, drinks, appConfig.latest_version, isNativePlatform]);

    // 清除所有数据
    const clearAllData = useCallback(async () => {
        if (window.confirm("您确定要清除所有本地数据吗？此操作不可撤销。")) {
            try {
                await Preferences.remove({ key: 'caffeineRecords' });
                await Preferences.remove({ key: 'caffeineSettings' });
                await Preferences.remove({ key: 'caffeineDrinks' });
                setRecords([]);
                onUpdateSettings(defaultSettings);
                setDrinks(initialPresetDrinks);
                alert("所有本地数据已清除。");
            } catch (error) {
                console.error("清除数据时出错:", error);
                alert("清除数据失败，请稍后再试。");
            }
        }
    }, [setRecords, onUpdateSettings, setDrinks]);

    // 导入数据
    const importData = useCallback(async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedFullData = JSON.parse(e.target.result);

                // 确保导入的数据结构是预期的
                if (!importedFullData || typeof importedFullData !== 'object') {
                    alert("导入文件格式无效。");
                    return;
                }

                const { records: importedRecords, drinks: importedDrinks, userSettings: importedUserSettings, version } = importedFullData;

                if (!Array.isArray(importedRecords) || !Array.isArray(importedDrinks) || typeof importedUserSettings !== 'object') {
                    alert("导入数据结构不完整或无效。");
                    return;
                }

                // 合并设置，但保留当前的 WebDAV 凭据和同步频率等敏感或设备特定的设置
                const currentWebDavPassword = userSettings.webdavPassword || (await Preferences.get({ key: WEBDAV_PASSWORD_KEY })).value;
                const settingsToKeep = {
                    webdavServer: userSettings.webdavServer,
                    webdavUsername: userSettings.webdavUsername,
                    webdavPassword: currentWebDavPassword,
                    webdavEnabled: userSettings.webdavEnabled,
                    webdavSyncFrequency: userSettings.webdavSyncFrequency,
                    lastSyncTimestamp: userSettings.lastSyncTimestamp,
                    localLastModifiedTimestamp: Date.now(),
                    themeMode: userSettings.themeMode,
                };

                const mergedSettings = {
                    ...defaultSettings,
                    ...importedUserSettings,
                    ...settingsToKeep
                };

                // 更新状态
                setRecords(importedRecords || []);
                setDrinks(importedDrinks || []);
                onUpdateSettings(mergedSettings, null, true);

                alert('数据导入成功！');
            } catch (error) {
                console.error("导入数据时出错:", error);
                alert(`导入失败: ${error.message}`);
            }
        };
        reader.readAsText(file);
        event.target.value = null;
    }, [setRecords, onUpdateSettings, setDrinks, userSettings]);

    // 处理手动导入
    const handleManualImport = useCallback(async (url) => {
        if (!url) return;

        // 直接导航到导入页面
        window.location.href = url;
    }, []);

    // 处理扫描二维码
    const handleScanQRCode = useCallback(async () => {
        if (!isNativePlatform || !Capacitor.isPluginAvailable('BarcodeScanner')) {
            alert('扫码功能仅在原生App中可用。');
            return;
        }

        let BarcodeScanner;
        try {
            ({ BarcodeScanner } = await import('@capacitor-community/barcode-scanner'));

            const permission = await BarcodeScanner.checkPermission({ force: true });
            if (!permission.granted) {
                alert('需要相机权限才能扫描二维码');
                return;
            }

            // 显示扫码 overlay
            const overlay = document.getElementById('scanner-overlay');
            if (overlay) {
                overlay.classList.add('active');
            }

            await BarcodeScanner.prepare?.();
            await BarcodeScanner.hideBackground?.();

            let result;
            try {
                result = await BarcodeScanner.startScan();
            } finally {
                await BarcodeScanner.showBackground?.();
                await BarcodeScanner.stopScan?.();
                // 隐藏扫码 overlay
                if (overlay) {
                    overlay.classList.remove('active');
                }
            }

            if (result?.hasContent && result.content) {
                setScannedContent(result.content);
                setShowManualImport(true);
            }
        } catch (error) {
            // 确保 overlay 被隐藏
            const overlay = document.getElementById('scanner-overlay');
            if (overlay) {
                overlay.classList.remove('active');
            }
            await BarcodeScanner?.showBackground?.();
            await BarcodeScanner?.stopScan?.();
            console.error('扫描二维码失败:', error);
            alert('扫描失败，请重试。');
        }
    }, [isNativePlatform, setImportConfigParam, setShowManualImport]);

    return (
        <div className="columns-1 sm:columns-2 xl:columns-3 gap-4 w-full">
            {/* 个人参数设置 */}
            <section
                aria-labelledby="personal-settings-heading"
                className="max-w-md w-full mb-5 rounded-xl p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
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
                    <User size={20} className="mr-2" /> 个人参数
                </h2>
                <div className="space-y-4">
                    {/* 体重 */}
                    <div>
                        <label
                            htmlFor="userWeight"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Weight size={14} className="inline mr-1" />体重 (kg):
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
                            <Target size={14} className="inline mr-1" />通用每日最大摄入量 (mg):
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
                            <Target size={14} className="inline mr-1" />个性化推荐剂量 (mg/kg):
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

            {/* 代谢与睡眠设置 */}
            <section
                aria-labelledby="metabolism-settings-heading"
                className="max-w-md w-full mb-5 rounded-xl p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
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
                    <Sliders size={20} className="mr-2" /> 代谢与睡眠设置
                </h2>
                <div className="space-y-4">
                    {/* 咖啡因半衰期 */}
                    <div>
                        <label
                            htmlFor="caffeineHalfLife"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Clock size={14} className="inline mr-1" />咖啡因半衰期 (小时):
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
                            <Droplet size={14} className="inline mr-1" />分布容积 (L/kg):
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
                            <Moon size={14} className="inline mr-1" />睡前安全浓度阈值 (mg/L):
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
                            <Moon size={14} className="inline mr-1" />计划睡眠时间:
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

            {/* WebDAV 同步设置 */}
            <section
                aria-labelledby="webdav-settings-heading"
                className="max-w-md w-full mb-5 rounded-xl p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
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
                    <CloudDownload size={20} className="mr-2" /> WebDAV 同步
                </h2>
                <div className="space-y-4">
                    {/* 启用WebDAV */}
                    <div className="flex items-center">
                        <input
                            id="webdavEnabled"
                            type="checkbox"
                            className="mr-2 h-4 w-4 rounded border focus:ring-2 cursor-pointer transition-colors"
                            style={{
                                borderColor: colors.borderStrong,
                                accentColor: colors.accent
                            }}
                            checked={userSettings.webdavEnabled}
                            onChange={(e) => handleSettingChange('webdavEnabled', e.target.checked)}
                        />
                        <label
                            htmlFor="webdavEnabled"
                            className="font-medium cursor-pointer transition-colors"
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
                            <Server size={14} className="inline mr-1" /> WebDAV服务器地址:
                        </label>
                        <input
                            id="webdavServer"
                            type="text"
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
                            autoComplete="off"
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            输入您的WebDAV服务器完整URL地址。
                        </p>
                        {userSettings.webdavServer && userSettings.webdavServer.includes('dav.jianguoyun.com') && (
                            <p
                                className="text-xs mt-1 transition-colors"
                                style={{ color: colors.accent }}
                            >
                                坚果云用户请确保路径包含同步文件夹，如：https://dav.jianguoyun.com/dav/我的坚果云/
                            </p>
                        )}
                    </div>

                    {/* 用户名 */}
                    <div>
                        <label
                            htmlFor="webdavUsername"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <User size={14} className="inline mr-1" /> WebDAV用户名:
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
                            autoComplete="username"
                        />
                    </div>

                    {/* 密码 */}
                    <div>
                        <label
                            htmlFor="webdavPassword"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Lock size={14} className="inline mr-1" /> WebDAV密码:
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
                            autoComplete="current-password"
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            建议使用应用专用密码，密码将安全存储在本地。
                        </p>
                    </div>

                    {/* 同步频率 */}
                    <div>
                        <label
                            htmlFor="webdavSyncFrequency"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Activity size={14} className="inline mr-1" /> 同步模式:
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
                    <div className="space-y-2">
                        {/* 第一行：测试连接和立即同步 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                onClick={testWebDAVConnection}
                                className="py-2 px-4 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors duration-200 text-sm shadow flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!isWebDAVConfigured || testingWebDAV}
                            >
                                <TestTubeDiagonal size={16} className="mr-1.5" aria-hidden="true" />
                                {testingWebDAV ? '测试中...' : '测试连接'}
                            </button>
                            <button
                                onClick={onManualSync}
                                className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200 text-sm shadow flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!isWebDAVConfigured || syncStatus.inProgress}
                            >
                                <CloudDownload size={16} className="mr-1.5" aria-hidden="true" />
                                {syncStatus.inProgress ? '同步中...' : '立即同步'}
                            </button>
                        </div>
                        
                        {/* 配置有效时显示：生成配置分享 */}
                        {isWebDAVConfigured && (
                            <button
                                onClick={() => setShowConfigShare(true)}
                                className="w-full py-2 px-4 text-white rounded-md transition-colors duration-200 text-sm shadow flex items-center justify-center font-medium"
                                style={{
                                    backgroundColor: colors.accent
                                }}
                            >
                                <Smartphone size={16} className="mr-1.5" aria-hidden="true" />
                                分享同步配置
                            </button>
                        )}
                        
                        {/* 配置无效时显示提示 */}
                        {!isWebDAVConfigured && userSettings.webdavEnabled && (
                            <div 
                                className="p-3 rounded-lg text-sm border"
                                style={{
                                    backgroundColor: colors.warningBg,
                                    borderColor: colors.warning,
                                    color: colors.warningText
                                }}
                            >
                                <p className="font-medium flex items-center">
                                    <HelpCircle size={16} className="mr-2" />
                                    配置不完整
                                </p>
                                <p className="mt-1 text-xs">
                                    请确保已填写服务器地址、用户名和密码，才能生成配置分享或进行同步。
                                </p>
                            </div>
                        )}
                        
                        {/* 导入配置按钮：扫描二维码和手动导入 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* 扫描配置二维码按钮 - 仅在原生平台显示 */}
                            {isNativePlatform && (
                                <button
                                    onClick={() => handleScanQRCode()}
                                    className="py-2 px-4 border rounded-md transition-colors duration-200 text-sm flex items-center justify-center font-medium"
                                    style={{
                                        borderColor: colors.borderStrong,
                                        color: colors.textSecondary,
                                        backgroundColor: 'transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.bgBase;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <Camera size={16} className="mr-1.5" aria-hidden="true" />
                                    扫描配置二维码
                                </button>
                            )}
                            {/* 手动导入配置按钮 */}
                            <button
                                onClick={() => setShowManualImport(true)}
                                className={`py-2 px-4 border rounded-md transition-colors duration-200 text-sm flex items-center justify-center font-medium ${!isNativePlatform ? 'col-span-2' : ''}`}
                                style={{
                                    borderColor: colors.borderStrong,
                                    color: colors.textSecondary,
                                    backgroundColor: 'transparent'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = colors.bgBase;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <LinkIcon size={16} className="mr-1.5" aria-hidden="true" />
                                手动导入配置
                            </button>
                        </div>
                    </div>



                    {/* 测试结果 */}
                    {webDAVTestResult && (
                        <div 
                            className="p-3 rounded-lg text-sm border"
                            style={{
                                backgroundColor: webDAVTestResult.success ? colors.safeBg : colors.dangerBg,
                                borderColor: webDAVTestResult.success ? colors.safe : colors.danger,
                                color: webDAVTestResult.success ? colors.safeText : colors.dangerText
                            }}
                        >
                            <div className="flex items-start">
                                <div 
                                    className="flex-shrink-0 w-4 h-4 rounded-full mt-0.5 mr-2"
                                    style={{ 
                                        backgroundColor: webDAVTestResult.success ? colors.safe : colors.danger 
                                    }}
                                />
                                <div className="flex-1">
                                    <p className="font-medium">
                                        {webDAVTestResult.success ? '连接成功' : '连接失败'}
                                    </p>
                                    <p className="mt-1">
                                        {webDAVTestResult.message}
                                    </p>
                                    {!webDAVTestResult.success && (
                                        <div className="mt-2 text-xs">
                                            <p className="font-medium mb-2" style={{ color: colors.dangerText }}>故障排除建议:</p>
                                            <ul className="list-disc list-inside mt-1 space-y-1">
                                                <li>确认服务器地址格式正确 (http:// 或 https://)</li>
                                                <li>检查用户名和密码是否正确</li>
                                                <li>确认网络连接正常</li>
                                                <li>确认WebDAV服务已启用</li>
                                                <li>尝试使用其他WebDAV客户端测试服务器连接</li>
                                            </ul>
                                            <br></br>
                                            <p className="font-medium mb-2" style={{ color: colors.dangerText }}>推荐解决方案:</p>
                                            <div 
                                                className="border rounded p-2 mb-2"
                                                style={{
                                                    backgroundColor: colors.infoBg,
                                                    borderColor: colors.info
                                                }}
                                            >
                                                <p className="font-medium flex items-center" style={{ color: colors.infoText }}>
                                                    <Smartphone size={14} className="mr-1.5" />
                                                    使用Android APP (推荐)
                                                </p>
                                                <p className="mt-1" style={{ color: colors.infoText }}>Android APP不受CORS限制，同步成功率更高。</p>
                                                <a
                                                    href={appConfig.download_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-block mt-1 underline"
                                                    style={{ color: colors.infoText }}
                                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                >
                                                    下载Android APP →
                                                </a>
                                            </div>
                                            <div 
                                                className="border rounded p-2 mb-2"
                                                style={{
                                                    backgroundColor: colors.bgBase,
                                                    borderColor: colors.borderStrong
                                                }}
                                            >
                                                <p className="font-medium flex items-center" style={{ color: colors.textPrimary }}>
                                                    <Mail size={14} className="mr-1.5" />
                                                    联系支持
                                                </p>
                                                <p className="mt-1" style={{ color: colors.textSecondary }}>如果问题持续存在，请发送邮件至:</p>
                                                <a
                                                    href="mailto:i@jerryz.com.cn?subject=咖啡因追踪器WebDAV同步问题&body=请描述您遇到的问题，并附上您的WebDAV服务商信息（如坚果云、NextCloud等）。"
                                                    className="inline-block mt-1 underline"
                                                    style={{ color: colors.textSecondary }}
                                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                >
                                                    i@jerryz.com.cn
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 同步状态 */}
                    {syncStatus.lastSyncTime && (
                        <div className="text-sm transition-colors">
                            <div className="flex items-center" style={{ color: colors.textSecondary }}>
                                <Clock size={14} className="mr-2" />
                                <span>上次同步: {formatDatetimeLocal(syncStatus.lastSyncTime).replace('T', ' ')}</span>
                            </div>
                            {syncStatus.lastSyncResult && (
                                <div
                                    className="mt-2 p-3 border rounded-md flex items-start"
                                    style={{
                                        backgroundColor: syncStatus.lastSyncResult.success ? colors.safeBg : colors.dangerBg,
                                        borderColor: syncStatus.lastSyncResult.success ? colors.safe : colors.danger
                                    }}
                                >
                                    {syncStatus.lastSyncResult.success ? (
                                        <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" style={{ color: colors.safe }} />
                                    ) : (
                                        <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" style={{ color: colors.danger }} />
                                    )}
                                    <div className="ml-3" style={{ color: syncStatus.lastSyncResult.success ? colors.safeText : colors.dangerText }}>
                                        <p className="font-medium">
                                            {syncStatus.lastSyncResult.success ? '同步成功' : '同步失败'}
                                        </p>
                                        <p className="mt-1 break-words text-xs sm:text-sm">
                                            {syncStatus.lastSyncResult.message}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {syncStatus.lastSyncResult && !syncStatus.lastSyncResult.success && (
                                <div 
                                    className="mt-2 p-2 border rounded text-xs"
                                    style={{
                                        backgroundColor: colors.warningBg,
                                        borderColor: colors.warning
                                    }}
                                >
                                    <p className="font-medium flex items-center" style={{ color: colors.warningText }}>
                                        <Lightbulb size={14} className="mr-1.5" />
                                        同步失败解决建议:
                                    </p>
                                    <p className="mt-1" style={{ color: colors.warningText }}>
                                        建议使用 <a
                                            href={appConfig.download_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline"
                                            style={{ color: colors.warningText }}
                                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                        >Android APP</a> 或联系 <a
                                            href="mailto:i@jerryz.com.cn?subject=咖啡因追踪器WebDAV同步问题"
                                            className="underline"
                                            style={{ color: colors.warningText }}
                                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                        >技术支持</a>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* 饮品管理 */}
            <section
                aria-labelledby="drink-management-heading"
                className="max-w-md w-full mb-5 rounded-xl p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
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
                    <Coffee size={20} className="mr-2" /> 饮品管理
                </h2>
                {/* 饮品编辑器/添加按钮 */}
                {showDrinkEditor ? (
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleAddOrUpdateDrink(); }}
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
                                required
                            />
                        </div>

                        {/* 计算模式选择 */}
                        <div className="mb-3">
                            <label
                                htmlFor="newDrinkCalculationMode"
                                className="block mb-1 text-sm font-medium transition-colors"
                                style={{ color: colors.textSecondary }}
                            >
                                咖啡因计算模式:
                            </label>
                            <select
                                id="newDrinkCalculationMode"
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
                                value={newDrinkCalculationMode}
                                onChange={(e) => setNewDrinkCalculationMode(e.target.value)}
                            >
                                <option value="per100ml">按液体体积 (mg/100ml)</option>
                                <option value="perGram">按咖啡豆重量 (mg/g)</option>
                            </select>
                        </div>

                        {/* 咖啡因含量输入框 - 条件渲染 */}
                        {newDrinkCalculationMode === 'per100ml' && (
                            <div className="mb-3">
                                <label
                                    htmlFor="newDrinkCaffeineContent"
                                    className="block mb-1 text-sm font-medium transition-colors"
                                    style={{ color: colors.textSecondary }}
                                >
                                    咖啡因含量 (mg/100ml):
                                </label>
                                <input
                                    id="newDrinkCaffeineContent"
                                    type="number"
                                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                                    style={{
                                        borderColor: colors.borderStrong,
                                        backgroundColor: colors.bgCard,
                                        color: colors.textPrimary
                                    }}
                                    value={newDrinkCaffeineContent}
                                    onChange={(e) => setNewDrinkCaffeineContent(e.target.value)}
                                    placeholder="每100ml液体中的咖啡因毫克数"
                                    min="0"
                                    step="0.1"
                                    required={newDrinkCalculationMode === 'per100ml'}
                                />
                            </div>
                        )}

                        {/* 每克咖啡豆咖啡因含量 - 条件渲染 */}
                        {newDrinkCalculationMode === 'perGram' && (
                            <div className="mb-3">
                                <label
                                    htmlFor="newDrinkCaffeinePerGram"
                                    className="block mb-1 text-sm font-medium transition-colors"
                                    style={{ color: colors.textSecondary }}
                                >
                                    每克咖啡豆咖啡因含量 (mg/g):
                                </label>
                                <input
                                    id="newDrinkCaffeinePerGram"
                                    type="number"
                                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                                    style={{
                                        borderColor: colors.borderStrong,
                                        backgroundColor: colors.bgCard,
                                        color: colors.textPrimary
                                    }}
                                    value={newDrinkCaffeinePerGram}
                                    onChange={(e) => setNewDrinkCaffeinePerGram(e.target.value)}
                                    placeholder="每克咖啡豆的咖啡因毫克数"
                                    min="0"
                                    step="0.1"
                                    required={newDrinkCalculationMode === 'perGram'}
                                />
                            </div>
                        )}

                        {/* 默认容量/用量 */}
                        <div className="mb-3">
                            <label
                                htmlFor="newDrinkVolume"
                                className="block mb-1 text-sm font-medium transition-colors"
                                style={{ color: colors.textSecondary }}
                            >
                                {newDrinkCalculationMode === 'perGram' ? '默认用量 (g, 可选):' : '默认容量 (ml, 可选):'}
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
                                placeholder={newDrinkCalculationMode === 'perGram' ? "例如: 15 (克)" : "例如: 350 (毫升)"}
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
                                type="submit"
                                className="flex-1 py-2 px-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 text-sm shadow flex items-center justify-center font-medium"
                            >
                                <Save size={16} className="mr-1.5" /> {editingDrink ? '保存修改' : '添加饮品'}
                            </button>
                            <button
                                type="button"
                                onClick={resetDrinkForm}
                                className="flex-1 py-2 px-3 border rounded-md hover:bg-gray-100 transition-colors duration-200 text-sm flex items-center justify-center font-medium"
                                style={{
                                    borderColor: colors.borderStrong,
                                    color: colors.textSecondary
                                }}
                            >
                                <X size={16} className="mr-1.5" /> 取消
                            </button>
                        </div>
                    </form>
                ) : (
                    <button
                        onClick={() => setShowDrinkEditor(true)}
                        className="w-full py-2.5 mb-4 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center text-sm shadow font-medium"
                    >
                        <Plus size={16} className="mr-1.5" /> 添加自定义饮品
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
                        <HelpCircle size={14} className="mr-1 flex-shrink-0" />
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
                                            <p
                                                className="font-medium truncate transition-colors"
                                                style={{
                                                    color: !drink.isPreset
                                                        ? (drink.iconColor || colors.customDrinkText)
                                                        : (drink.iconColor || colors.espresso)
                                                }}
                                                title={drink.name}
                                            >
                                                {drink.name}
                                            </p>
                                            <p
                                                className="text-xs mt-0.5 transition-colors"
                                                style={{
                                                    color: !drink.isPreset
                                                        ? (drink.iconColor || colors.customDrinkText)
                                                        : (drink.iconColor || colors.textMuted)
                                                }}
                                            >
                                                <span className="inline-flex items-center mr-2">
                                                    <Tag size={12} className="mr-0.5" />{drink.category || DEFAULT_CATEGORY}
                                                </span>
                                                <span>
                                                    {drink.calculationMode === 'perGram'
                                                        ? `${drink.caffeinePerGram ?? 0}mg/g`
                                                        : `${drink.caffeineContent ?? 0}mg/100ml`}
                                                </span>
                                                {drink.defaultVolume && (
                                                    <span className="ml-1">
                                                        ({drink.defaultVolume}{drink.calculationMode === 'perGram' ? 'g' : 'ml'})
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center flex-shrink-0 space-x-1 ml-2">
                                            <button
                                                onClick={() => editDrink(drink)}
                                                className="p-1.5 rounded-full transition-colors duration-150"
                                                style={{ 
                                                    color: colors.textSecondary,
                                                    ':hover': { backgroundColor: colors.bgBase }
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.borderSubtle}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                aria-label={`编辑 ${drink.name}`}
                                            >
                                                <Edit size={14} />
                                            </button>
                                            {!isOriginalPreset ? (
                                                <button
                                                    onClick={() => deleteDrink(drink.id)}
                                                    className="p-1.5 rounded-full transition-colors duration-150"
                                                    style={{ color: colors.danger }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = colors.dangerBg;
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                    aria-label={`删除 ${drink.name}`}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            ) : (
                                                <span
                                                    className="p-1.5 cursor-not-allowed"
                                                    style={{ color: colors.textMuted, opacity: 0.4 }}
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

            {/* 数据管理 */}
            <section
                aria-labelledby="data-management-heading"
                className="max-w-md w-full mb-5 rounded-xl p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
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
                    <Database size={20} className="mr-2" /> 数据管理
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
                            <Download size={16} className="mr-1.5" /> 导出所有数据 (.json)
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
                            <Upload size={16} className="mr-1.5" /> 选择文件导入数据
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={importData}
                                aria-label="选择要导入的 JSON 文件"
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
                            <RotateCcw size={16} className="mr-1.5" /> 清除所有本地数据
                        </button>
                        <p className="text-xs text-red-500 mt-1">
                            警告：此操作将永久删除所有记录、设置和自定义饮品，并重置为初始预设。
                        </p>
                    </div>
                </div>
            </section>
            
            {/* 配置分享对话框 */}
            {showConfigShare && (
                <SyncConfigShare
                    webdavConfig={{
                        server: userSettings.webdavServer,
                        username: userSettings.webdavUsername,
                        password: userSettings.webdavPassword
                    }}
                    onClose={() => setShowConfigShare(false)}
                    colors={colors}
                />
            )}

            {/* 手动导入模态框 */}
            {showManualImport && (
                <ManualImportModal 
                    onClose={() => {
                        setShowManualImport(false);
                        setScannedContent(''); // 关闭时清空扫描内容
                    }} 
                    colors={colors}
                    onImportConfig={onImportConfig}
                    initialConfigParam={importConfigParam}
                    isNativePlatform={isNativePlatform}
                    initialScannedContent={scannedContent}
                />
            )}
            
            {/* 扫码界面 overlay */}
            <div id="scanner-overlay">
                <button id="scanner-back-btn" onClick={async () => {
                    try {
                        const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
                        await BarcodeScanner.stopScan?.();
                        await BarcodeScanner.showBackground?.();
                        document.getElementById('scanner-overlay').classList.remove('active');
                    } catch (error) {
                        console.error('停止扫码失败:', error);
                    }
                }}>
                    返回
                </button>
                <div className="scan-frame"></div>
                <div className="scan-line"></div>
            </div>
        </div>
    );
};

export default SettingsView;
