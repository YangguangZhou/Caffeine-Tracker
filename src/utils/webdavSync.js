// webdavSync.js
// WebDAV 同步实用工具

import { Capacitor } from '@capacitor/core';

const knownSettingKeys = [
    'weight', 'maxDailyCaffeine', 'recommendedDosePerKg',
    'safeSleepThresholdConcentration', 'volumeOfDistribution',
    'caffeineHalfLifeHours', 'themeMode', 'webdavEnabled',
    'webdavServer', 'webdavUsername', 'webdavSyncFrequency', 
    'lastSyncTimestamp', 'develop', 'plannedSleepTime',
    'localLastModifiedTimestamp'
];

/**
 * WebDAV 同步客户端
 * 提供与 WebDAV 服务器连接和同步数据的功能。
 */
export default class WebDAVClient {
    constructor(server, username, password) {
        if (!server || !username) {
           console.warn("WebDAVClient 使用不完整的凭据进行初始化。");
        }
        
        this.server = server ? (server.endsWith('/') ? server : `${server}/`) : '';
        this.username = username;
        this.password = password;
        this.fileName = 'caffeine-tracker-data.json';
        this.authHeader = (username && password) ? 'Basic ' + btoa(`${username}:${password}`) : null;
        this.platform = Capacitor.getPlatform();
        this.isNative = Capacitor.isNativePlatform();
    }

    isConfigured() {
        return !!this.server && !!this.username && !!this.password && !!this.authHeader;
    }

    /**
     * 创建标准化的fetch请求配置
     * 修复CORS问题的关键在这里
     */
    createFetchOptions(method, additionalHeaders = {}, body = null) {
        const headers = {
            ...additionalHeaders
        };

        // 只添加必要的认证头
        if (this.authHeader) {
            headers['Authorization'] = this.authHeader;
        }

        const fetchOptions = {
            method,
            headers
        };

        if (body !== null) {
            fetchOptions.body = body;
        }

        // 根据平台设置不同的请求配置
        if (!this.isNative) {
            // Web平台：正确配置CORS
            fetchOptions.mode = 'cors';
            // 不发送cookies，避免CORS复杂度
            fetchOptions.credentials = 'omit';
            // 避免缓存问题
            fetchOptions.cache = 'no-cache';
        }

        return fetchOptions;
    }

    /**
     * 执行HTTP请求并处理错误
     */
    async executeRequest(url, options, operation = 'request') {
        try {
            const response = await fetch(url.toString(), options);
            
            // 只在开发模式下记录详细信息
            if (this.isDevelopMode) {
                console.log(`${operation} 响应:`, {
                    status: response.status,
                    ok: response.ok
                });
            }

            return response;
        } catch (error) {
            console.error(`${operation} 请求失败:`, error.message);
            throw error;
        }
    }

    async testConnection() {
        if (!this.isConfigured()) {
            return { success: false, message: "缺少WebDAV配置信息" };
        }

        if (!this.server.startsWith('http')) {
            return { success: false, message: "服务器URL必须以http://或https://开头" };
        }

        try {
            const url = new URL(this.fileName, this.server);
            
            // 尝试简单的GET请求而不是HEAD
            const fetchOptions = this.createFetchOptions('GET');
            const response = await this.executeRequest(url, fetchOptions, '连接测试');
            
            if (response.ok || response.status === 404) {
                return { 
                    success: true, 
                    message: `连接成功` 
                };
            } else if (response.status === 401) {
                return { 
                    success: false, 
                    message: `认证失败: 请检查用户名和密码` 
                };
            } else if (response.status === 403) {
                return { 
                    success: false, 
                    message: `权限被拒绝: 用户可能没有访问权限` 
                };
            } else {
                return { 
                    success: false, 
                    message: `连接失败: ${response.status} ${response.statusText}` 
                };
            }

        } catch (error) {
            let message = `连接错误: ${error.message}`;
            
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                if (this.isNative) {
                    message = "网络连接失败，请检查网络和服务器地址";
                } else {
                    message = "连接失败，可能是CORS配置问题。请确保WebDAV服务器允许跨域访问。";
                }
            }
            
            return { success: false, message };
        }
    }

    async checkFileExists() {
        if (!this.isConfigured()) {
            return false;
        }

        try {
            const url = new URL(this.fileName, this.server);
            const fetchOptions = this.createFetchOptions('HEAD');
            const response = await this.executeRequest(url, fetchOptions, '文件检查');
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async downloadData() {
        if (!this.isConfigured()) {
            throw new Error("WebDAV未配置");
        }

        try {
            const url = new URL(this.fileName, this.server);
            const fetchOptions = this.createFetchOptions('GET');
            const response = await this.executeRequest(url, fetchOptions, '下载数据');

            if (response.status === 404) {
                return null; // 文件不存在，返回null
            }

            if (response.status === 401) {
                throw new Error("认证失败: 用户名或密码错误");
            }

            if (response.status === 403) {
                throw new Error("权限被拒绝");
            }

            if (!response.ok) {
                throw new Error(`下载失败: ${response.status} ${response.statusText}`);
            }

            const text = await response.text();
            if (text.length === 0) {
                return null;
            }

            const data = JSON.parse(text);
            
            // 基本验证
            if (typeof data !== 'object' || data === null) {
                throw new Error("数据格式无效");
            }

            return data;
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error("下载的数据不是有效的JSON格式");
            }
            throw error;
        }
    }

    async uploadData(data) {
        if (!this.isConfigured()) {
            throw new Error("WebDAV未配置");
        }
        
        if (typeof data !== 'object' || data === null) {
            throw new Error("无效的上传数据");
        }

        // 创建上传数据的深拷贝，移除敏感信息
        const dataToUpload = JSON.parse(JSON.stringify(data));
        if (dataToUpload.userSettings?.webdavPassword) {
            delete dataToUpload.userSettings.webdavPassword;
        }

        try {
            const url = new URL(this.fileName, this.server);
            const jsonString = JSON.stringify(dataToUpload, null, 2);

            // 简化请求头，只保留必要的
            const additionalHeaders = {
                'Content-Type': 'application/json'
            };

            const fetchOptions = this.createFetchOptions('PUT', additionalHeaders, jsonString);
            const response = await this.executeRequest(url, fetchOptions, '上传数据');

            if (response.status === 401) {
                throw new Error("认证失败");
            }

            if (response.status === 403) {
                throw new Error("权限被拒绝");
            }

            if (response.status === 507) {
                throw new Error("服务器存储空间不足");
            }

            if (!response.ok) {
                throw new Error(`上传失败: ${response.status} ${response.statusText}`);
            }

            return { success: true, message: "数据上传成功" };
        } catch (error) {
            throw error;
        }
    }

    /**
     * 比较本地和远程数据的时间戳
     */
    compareTimestamps(localTs, remoteTs) {
        const localTimestamp = localTs || 0;
        const remoteTimestamp = remoteTs || 0;

        if (localTimestamp === 0 && remoteTimestamp === 0) return 'no_timestamps';
        if (localTimestamp > 0 && remoteTimestamp === 0) return 'only_local';
        if (remoteTimestamp > 0 && localTimestamp === 0) return 'only_remote';
        
        if (localTimestamp > remoteTimestamp) return 'local_newer';
        if (remoteTimestamp > localTimestamp) return 'remote_newer';
        return 'equal';
    }

    /**
     * 合并本地和远程数据
     */
    mergeData(localData, remoteData, initialPresetDrinks = [], originalPresetDrinkIds = new Set()) {
        const localTs = localData?.syncTimestamp || localData?.userSettings?.localLastModifiedTimestamp || 0;
        const remoteTs = remoteData?.syncTimestamp || 0;

        const comparison = this.compareTimestamps(localTs, remoteTs);
        const isRemotePrimary = comparison === 'remote_newer' || comparison === 'only_remote';

        const primarySource = isRemotePrimary ? remoteData : localData;
        const secondarySource = isRemotePrimary ? localData : remoteData;

        // 合并记录
        const recordMap = new Map();
        const allRecords = [...(localData.records || []), ...(remoteData.records || [])];
        allRecords.forEach(record => {
            if (!record?.id) return;
            
            const existing = recordMap.get(record.id);
            if (existing) {
                const tsExisting = existing.updatedAt || existing.timestamp || 0;
                const tsCurrent = record.updatedAt || record.timestamp || 0;
                if (tsCurrent > tsExisting) {
                    recordMap.set(record.id, { ...record });
                } else if (tsCurrent === tsExisting && tsCurrent !== 0) {
                    const primaryRecords = primarySource.records || [];
                    if (primaryRecords.some(r => r.id === record.id)) {
                        recordMap.set(record.id, { ...record });
                    }
                }
            } else {
                recordMap.set(record.id, { ...record });
            }
        });
        const mergedRecords = Array.from(recordMap.values());

        // 合并饮品
        const drinkMap = new Map();
        const allDrinks = [...(localData.drinks || []), ...(remoteData.drinks || [])];

        allDrinks.forEach(drink => {
            if (!drink?.id || typeof drink.name !== 'string') return;
            
            const existing = drinkMap.get(drink.id);
            if (existing) {
                const tsExisting = existing.updatedAt || 0;
                const tsCurrent = drink.updatedAt || 0;

                if (tsCurrent > tsExisting) {
                    drinkMap.set(drink.id, { ...drink });
                } else if (tsCurrent === tsExisting) {
                    const primaryDrinks = primarySource.drinks || [];
                    if (primaryDrinks.some(d => d.id === drink.id)) {
                        drinkMap.set(drink.id, { ...drink });
                    }
                }
            } else {
                drinkMap.set(drink.id, { ...drink });
            }
        });
        
        // 确保预设饮品存在
        initialPresetDrinks.forEach(presetDrink => {
            if (originalPresetDrinkIds.has(presetDrink.id)) {
                const existingDrink = drinkMap.get(presetDrink.id);
                if (!existingDrink) {
                    drinkMap.set(presetDrink.id, { 
                        ...presetDrink, 
                        updatedAt: presetDrink.updatedAt || 0, 
                        isPreset: true 
                    });
                } else {
                    drinkMap.set(presetDrink.id, { ...existingDrink, isPreset: true });
                }
            }
        });

        const mergedDrinks = Array.from(drinkMap.values());

        // 合并用户设置
        const mergedSettings = {};
        const primarySettings = primarySource?.userSettings || {};
        const secondarySettings = secondarySource?.userSettings || {};

        knownSettingKeys.forEach(key => {
            if (key === 'webdavPassword') return;

            if (primarySettings.hasOwnProperty(key)) {
                if (key === 'develop' && typeof primarySettings[key] !== 'boolean') {
                    mergedSettings[key] = secondarySettings[key] === true;
                } else {
                    mergedSettings[key] = primarySettings[key];
                }
            } else if (secondarySettings.hasOwnProperty(key)) {
                if (key === 'develop' && typeof secondarySettings[key] !== 'boolean') {
                    mergedSettings[key] = false;
                } else {
                    mergedSettings[key] = secondarySettings[key];
                }
            }
        });

        // 保留本地密码
        if (localData?.userSettings?.webdavPassword) {
            mergedSettings.webdavPassword = localData.userSettings.webdavPassword;
        }

        // 保留最新的本地修改时间戳
        if (localData?.userSettings?.localLastModifiedTimestamp && 
            localData.userSettings.localLastModifiedTimestamp > (primarySettings.localLastModifiedTimestamp || 0)) {
            mergedSettings.localLastModifiedTimestamp = localData.userSettings.localLastModifiedTimestamp;
        }

        return {
            records: mergedRecords.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
            drinks: mergedDrinks,
            userSettings: mergedSettings,
            syncTimestamp: Date.now(),
            version: primarySource.version || secondarySource.version || 'unknown'
        };
    }

    /**
     * 执行同步操作
     */
    async performSync(localData, initialPresetDrinks = [], originalPresetDrinkIds = new Set()) {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: "WebDAV未配置",
                data: null,
                timestamp: null
            };
        }

        const currentLocalData = typeof localData === 'object' && localData !== null 
            ? localData 
            : { records: [], drinks: [], userSettings: {}, version: 'unknown', syncTimestamp: 0 };
        
        const localTs = currentLocalData.userSettings?.localLastModifiedTimestamp || currentLocalData.syncTimestamp || null;

        try {
            // 下载远程数据
            let remoteData = null;
            try {
                remoteData = await this.downloadData();
            } catch (downloadError) {
                // 如果下载失败但有本地数据，尝试初始上传
                if (!localTs && (currentLocalData.records?.length > 0 || 
                    currentLocalData.drinks?.length > 0 || 
                    Object.keys(currentLocalData.userSettings || {}).filter(k => k !== 'webdavPassword').length > 0)) {
                    try {
                        const uploadTimestamp = Date.now();
                        const initialUploadData = { 
                            ...currentLocalData, 
                            syncTimestamp: uploadTimestamp,
                            userSettings: { ...(currentLocalData.userSettings || {}) }
                        };

                        await this.uploadData(initialUploadData);
                        
                        const returnData = { ...initialUploadData };
                        if (localData?.userSettings?.webdavPassword) {
                            returnData.userSettings = { 
                                ...returnData.userSettings, 
                                webdavPassword: localData.userSettings.webdavPassword 
                            };
                        }

                        return {
                            success: true,
                            message: "首次同步成功",
                            data: returnData,
                            timestamp: uploadTimestamp
                        };
                    } catch (uploadError) {
                        return { 
                            success: false, 
                            message: `同步失败: ${uploadError.message}`, 
                            data: null, 
                            timestamp: null 
                        };
                    }
                } else {
                    return { 
                        success: false, 
                        message: `同步失败: ${downloadError.message}`, 
                        data: null, 
                        timestamp: null 
                    };
                }
            }

            // 比较并决定操作
            const remoteTs = remoteData?.syncTimestamp || null;
            const comparison = this.compareTimestamps(localTs, remoteTs);

            let finalData = null;
            let message = "";

            switch (comparison) {
                case 'local_newer': 
                case 'only_local': 
                    const uploadTs = localTs || Date.now();
                    finalData = { 
                        ...currentLocalData, 
                        syncTimestamp: uploadTs,
                        userSettings: { ...(currentLocalData.userSettings || {}) }
                    };
                    await this.uploadData(finalData);
                    message = "同步成功：本地数据已上传";
                    if (localData?.userSettings?.webdavPassword && finalData.userSettings) {
                        finalData.userSettings.webdavPassword = localData.userSettings.webdavPassword;
                    }
                    break;

                case 'remote_newer': 
                case 'only_remote':
                case 'equal':
                case 'no_timestamps':
                    finalData = this.mergeData(currentLocalData, remoteData, initialPresetDrinks, originalPresetDrinkIds);
                    await this.uploadData(finalData);
                    message = "同步成功：数据已合并";
                    break;

                default:
                    finalData = currentLocalData;
                    message = "同步完成：数据未变更";
                    if (localData?.userSettings?.webdavPassword && finalData.userSettings && !finalData.userSettings.webdavPassword) {
                        finalData.userSettings.webdavPassword = localData.userSettings.webdavPassword;
                    }
            }

            return { 
                success: true, 
                message: message, 
                data: finalData, 
                timestamp: finalData?.syncTimestamp || localTs 
            };

        } catch (error) {
            // 返回本地数据以防止UI数据丢失
            const returnLocalDataOnError = { ...currentLocalData };
            if (localData?.userSettings?.webdavPassword && returnLocalDataOnError.userSettings) {
                returnLocalDataOnError.userSettings.webdavPassword = localData.userSettings.webdavPassword;
            }
            
            return { 
                success: false, 
                message: `同步失败: ${error.message}`, 
                data: returnLocalDataOnError,
                timestamp: localTs 
            };
        }
    }
}