// WebDAV 同步实用工具

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import JSZip from 'jszip';
import { getPresetIconColor, DEFAULT_CATEGORY } from './constants';
import { deserializeSQLiteBytes, serializeDataToSQLiteBytes } from './db';

// 将 ArrayBuffer 转为 Base64，供原生 HTTP 上传使用
const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const SIZE_MISMATCH_TOLERANCE_BYTES = 1024;
const SIZE_MISMATCH_TOLERANCE_RATIO = 0.01;

const knownSettingKeys = [
    'weight', 'maxDailyCaffeine', 'recommendedDosePerKg',
    'safeSleepThresholdConcentration', 'volumeOfDistribution',
    'caffeineHalfLifeHours',
    'webdavSyncFrequency', 'lastSyncTimestamp', 'develop', 'plannedSleepTime',
    'localLastModifiedTimestamp'
];

/**
 * WebDAV 同步客户端
 */
export default class WebDAVClient {
    constructor(server, username, password, logger = null) {
        if (!server || !username) {
            console.warn("WebDAVClient 使用不完整的凭据进行初始化。");
        }

        this.server = server ? (server.endsWith('/') ? server : `${server}/`) : '';
        this.username = username;
        this.password = password;
        this.dbFileName = 'caffeine-tracker.sqlite';
        this.zipFileName = 'caffeine-tracker-backup.zip';
        this.jsonFileName = 'caffeine-tracker-db.json';
        this.legacyFileName = 'caffeine-tracker-data.json';
        this.fileName = this.dbFileName; // 默认以真实数据库文件为主
        this.authHeader = (username && password) ? 'Basic ' + btoa(`${username}:${password}`) : null;
        this.userAgent = 'CaffeineTracker/1.0 (WebDAVClient)';
        this.platform = Capacitor.getPlatform();
        this.isNative = Capacitor.isNativePlatform();
        this.logger = logger;

        this.log('WebDAVClient 初始化完成', 'info');
    }

    log(message, type = 'info') {
        if (this.logger) {
            this.logger(message, type);
        }
        // Also log to console for debugging
        if (type === 'error') console.error(`[WebDAV] ${message}`);
        else if (type === 'warn') console.warn(`[WebDAV] ${message}`);
        else console.log(`[WebDAV] ${message}`);
    }

    isConfigured() {
        const configured = !!this.server && !!this.username && !!this.password && !!this.authHeader;
        return configured;
    }

    // 创建请求配置
    createFetchOptions(method, additionalHeaders = {}, body = null) {
        // 修复：使用 UTF-8 安全的 Base64 编码，防止中文用户名/密码乱码
        const safeBtoa = (str) => {
            try {
                return btoa(unescape(encodeURIComponent(str)));
            } catch (e) {
                console.warn("Base64编码失败，回退到普通btoa", e);
                return btoa(str);
            }
        };
        const currentAuthHeader = (this.username && this.password) ? 'Basic ' + safeBtoa(`${this.username}:${this.password}`) : null;

        const headers = {
            'User-Agent': this.userAgent,
            ...additionalHeaders
        };

        // 添加认证头
        if (currentAuthHeader) {
            if (this.isNative || method !== 'OPTIONS') {
                headers['Authorization'] = currentAuthHeader;
            }
        }

        const fetchOptions = {
            method,
            headers
        };

        if (body !== null) {
            fetchOptions.body = body;
        }

        // 平台相关配置
        if (this.isNative) {
            // 原生平台无需CORS设置
        } else {
            // Web平台需要CORS设置
            fetchOptions.mode = 'cors';
            fetchOptions.credentials = 'omit';
            fetchOptions.cache = 'no-cache';
        }

        return fetchOptions;
    }

    // 执行HTTP请求
    async executeRequest(url, options, operation = 'request') {
        this.log(`开始执行 ${operation}: ${options.method} ${url.toString()}`, 'info');

        try {
            const response = await fetch(url.toString(), options);

            this.log(`${operation} 响应状态: ${response.status} ${response.statusText}`, response.ok ? 'info' : 'warn');

            return response;
        } catch (error) {
            this.log(`${operation} 请求失败: ${error.message}`, 'error');

            throw error;
        }
    }

    async testConnection() {
        this.log("开始WebDAV连接测试...", 'info');

        if (!this.isConfigured()) {
            const error = "缺少WebDAV配置信息 (服务器, 用户名, 或密码)";
            this.log(error, 'error');
            return { success: false, message: error };
        }

        if (!this.server.startsWith('http')) {
            const error = "服务器URL必须以http://或https://开头";
            console.error("URL格式错误:", error);
            return { success: false, message: error };
        }

        try {
            const url = new URL(this.fileName, this.server);
            let response;
            let testMethod = 'HEAD';

            try {
                // 尝试HEAD请求
                const fetchOptions = this.createFetchOptions('HEAD');
                response = await this.executeRequest(url, fetchOptions, 'HEAD连接测试');

                if (response.ok || response.status === 404) {
                    return {
                        success: true,
                        message: `连接成功 (${response.status} ${response.statusText} via HEAD)`
                    };
                } else if (response.status === 401) {
                    return {
                        success: false,
                        message: `认证失败 (401): 请检查用户名和密码`
                    };
                } else if (response.status === 403) {
                    return {
                        success: false,
                        message: `权限被拒绝 (403): 用户可能没有访问权限`
                    };
                } else if (response.status === 405) {
                    console.log("HEAD请求不被支持，尝试OPTIONS请求");
                    testMethod = 'OPTIONS';
                } else {
                    return {
                        success: false,
                        message: `连接失败: ${response.status} ${response.statusText} (HEAD请求)`
                    };
                }
            } catch (headError) {
                console.warn("HEAD请求失败，尝试OPTIONS请求:", headError.message);
                testMethod = 'OPTIONS';
            }

            if (testMethod === 'OPTIONS') {
                try {
                    const fetchOptions = this.createFetchOptions('OPTIONS');
                    response = await this.executeRequest(url, fetchOptions, 'OPTIONS连接测试');

                    if (response.ok) {
                        return {
                            success: true,
                            message: `连接成功 (${response.status} ${response.statusText} via OPTIONS)`
                        };
                    } else if (response.status === 401) {
                        return {
                            success: false,
                            message: `认证失败 (401): 请检查用户名和密码`
                        };
                    } else if (response.status === 403) {
                        return {
                            success: false,
                            message: `权限被拒绝 (403): 用户可能没有访问权限`
                        };
                    } else {
                        return {
                            success: false,
                            message: `连接失败: ${response.status} ${response.statusText} (OPTIONS请求)`
                        };
                    }
                } catch (optionsError) {
                    console.error("OPTIONS请求也失败:", optionsError.message);
                    throw optionsError;
                }
            }

        } catch (error) {
            console.error("WebDAV连接测试异常:", {
                message: error.message,
                platform: this.platform,
                name: error.name
            });

            let message = `连接错误: ${error.message}`;

            // 错误类型判断
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                if (this.isNative) {
                    message += " (请检查网络连接和服务器地址)";
                } else {
                    message += " (请检查网络连接、服务器URL和CORS配置)";
                }
            } else if (error.message.toLowerCase().includes('cors')) {
                message += " (CORS跨域问题：请在服务器端配置允许跨域访问)";
            } else if (error.message.toLowerCase().includes('network')) {
                message += " (网络连接问题：请检查网络状态)";
            } else if (error.message.toLowerCase().includes('ssl') || error.message.toLowerCase().includes('certificate')) {
                message += " (SSL证书问题：请检查HTTPS配置)";
            } else if (error.message.toLowerCase().includes('timeout')) {
                message += " (请求超时：请检查服务器响应速度)";
            }

            return { success: false, message: message };
        }
    }

    async checkFileExists() {
        console.log("检查远程文件是否存在...");

        if (!this.isConfigured()) {
            console.warn("未配置WebDAV，无法检查文件");
            return false;
        }

        try {
            const url = new URL(this.fileName, this.server);
            const fetchOptions = this.createFetchOptions('HEAD');
            const response = await this.executeRequest(url, fetchOptions, 'HEAD文件检查');

            const exists = response.ok;
            console.log(`文件存在检查结果: ${exists}`);
            return exists;
        } catch (error) {
            console.error("检查文件存在性时出错:", {
                message: error.message,
                platform: this.platform
            });
            return false;
        }
    }

    async downloadData() {
        this.log("开始下载远程数据...", 'info');

        if (!this.isConfigured()) {
            const error = "WebDAV未配置，无法下载数据";
            this.log(error, 'error');
            throw new Error(error);
        }

        try {
            const fetchOptions = this.createFetchOptions('GET');
            const candidateFiles = [
                { name: this.zipFileName, label: 'GET下载数据(ZIP)', type: 'zip' },
                { name: this.dbFileName, label: 'GET下载数据(SQLite)', type: 'sqlite' },
                { name: this.jsonFileName, label: 'GET下载数据(JSON)', type: 'json' },
                { name: this.legacyFileName, label: 'GET下载数据(Legacy)', type: 'json' }
            ];

            let response = null;
            let usedFile = null;
            let usedType = null;

            for (const candidate of candidateFiles) {
                const url = new URL(candidate.name, this.server);
                // executeRequest already logs
                const res = await this.executeRequest(url, fetchOptions, candidate.label);

                if (res.status === 404) {
                    this.log(`${candidate.name} 未找到 (404)，尝试下一个候选文件...`, 'warn');
                    continue;
                }

                response = res;
                usedFile = candidate.name;
                usedType = candidate.type;
                break;
            }

            if (!response) {
                this.log("远程文件未找到 (404) - 这是正常的，表示首次同步", 'info');
                return null;
            }

            if (response.status === 401) {
                throw new Error("认证失败 (401): 用户名或密码错误");
            }

            if (response.status === 403) {
                throw new Error("权限被拒绝 (403): 用户没有读取权限");
            }

            if (!response.ok) {
                const error = `下载数据失败: ${response.status} ${response.statusText}`;
                console.error(error);
                throw new Error(error);
            }

            if (usedType === 'zip') {
                let buffer = await response.arrayBuffer();
                if (!buffer || buffer.byteLength === 0) {
                    console.warn("下载的ZIP文件为空");
                    return null;
                }

                // 修复：检查是否为 Base64 编码的纯文本文件 (常见于 native upload 导致的问题)
                // "UEsDB" 是 "PK\x03\x04" 的 Base64 编码前缀
                const headerBytes = new Uint8Array(buffer).subarray(0, 5);
                const headerStr = String.fromCharCode(...headerBytes);
                if (headerStr === 'UEsDB') {
                    this.log("⚠️ 检测到 ZIP 文件内容为 Base64 文本 (UEsDB...)，正在尝试解码...", 'warn');
                    try {
                        const textContent = new TextDecoder().decode(buffer);
                        // 某些 WebDAV 服务器可能会在 text 中包含换行符
                        const base64Clean = textContent.replace(/[\r\n\s]/g, '');
                        const binaryStr = atob(base64Clean);
                        const len = binaryStr.length;
                        const bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++) {
                            bytes[i] = binaryStr.charCodeAt(i);
                        }
                        buffer = bytes.buffer;
                        this.log(`Base64数据已自动解码为二进制 ZIP (${buffer.byteLength} bytes)`, 'info');
                    } catch (b64Error) {
                        this.log(`尝试解码 Base64 ZIP 失败: ${b64Error.message}`, 'error');
                    }
                }
                
                try {
                    const zip = await JSZip.loadAsync(buffer);
                    const sqliteFile = zip.file(this.dbFileName);
                    
                    if (!sqliteFile) {
                        throw new Error(`ZIP文件中未找到 ${this.dbFileName}`);
                    }
                    
                    const bytes = await sqliteFile.async("uint8array");
                    const parsed = await deserializeSQLiteBytes(bytes);
                    const data = {
                        ...parsed,
                        version: parsed.version || parsed.userSettings?.version,
                        syncTimestamp: parsed.syncTimestamp || parsed.userSettings?.localLastModifiedTimestamp
                    };
                    
                    this.log("ZIP解压并解析SQLite成功", 'success');
                    return { format: 'sqlite-zip', data, bytes, usedFile };
                } catch (zipError) {
                    const headerBytes = new Uint8Array(buffer.slice(0, 32));
                    const headerHex = Array.from(headerBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
                    const contentType = response.headers?.get?.('content-type');
                    this.log(`ZIP解析失败: ${zipError.message}`, 'error');
                    this.log(`ZIP响应 Content-Type: ${contentType || '未知'}, 大小: ${buffer.byteLength} bytes, 头部Hex: ${headerHex}`, 'warn');
                    // 如果ZIP解析失败，可能需要尝试其他方式，但目前我们假设ZIP损坏就是损坏
                    return { format: 'corrupted', data: null, usedFile, error: zipError.message };
                }
            }

            if (usedType === 'sqlite') {
                const buffer = await response.arrayBuffer();
                if (!buffer || buffer.byteLength === 0) {
                    console.warn("下载的SQLite文件为空");
                    return null;
                }
                const bytes = new Uint8Array(buffer);

                try {
                    const parsed = await deserializeSQLiteBytes(bytes);
                    const data = {
                        ...parsed,
                        version: parsed.version || parsed.userSettings?.version,
                        syncTimestamp: parsed.syncTimestamp || parsed.userSettings?.localLastModifiedTimestamp
                    };

                    console.log("SQLite 数据下载成功", {
                        usedFile,
                        recordsCount: data.records?.length || 0,
                        drinksCount: data.drinks?.length || 0
                    });

                    return { format: 'sqlite', data, bytes, usedFile };
                } catch (sqliteError) {
                    // 记录详细的错误信息和文件头，以便调试
                    const headerBytes = bytes.slice(0, 16);
                    const headerHex = Array.from(headerBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
                    const headerText = new TextDecoder().decode(headerBytes).replace(/[\x00-\x1F\x7F-\x9F]/g, '.'); // Replace non-printable chars
                    
                    this.log(`SQLite解析失败: ${sqliteError.message}`, 'warn');
                    this.log(`文件头(Hex): ${headerHex}`, 'warn');
                    this.log(`文件头(Text): ${headerText}`, 'warn');
                    this.log("尝试按JSON兼容模式解析（可能是旧的.json或伪.db文件）", 'warn');

                    try {
                        const textFallback = new TextDecoder().decode(bytes);
                        const data = JSON.parse(textFallback);
                        if (typeof data !== 'object' || data === null) {
                            throw new Error('JSON内容无效');
                        }
                        this.log("使用JSON兼容模式解析成功", 'info');
                        console.log("使用JSON兼容模式解析成功", {
                            usedFile,
                            recordsCount: Array.isArray(data.records) ? data.records.length : Array.isArray(data.caffeineRecords) ? data.caffeineRecords.length : 0,
                            drinksCount: Array.isArray(data.drinks) ? data.drinks.length : Array.isArray(data.caffeineDrinks) ? data.caffeineDrinks.length : 0
                        });
                        return { format: 'json-fallback', data, usedFile };
                    } catch (jsonFallbackError) {
                        this.log(`兼容解析失败: ${jsonFallbackError.message}`, 'error');
                        return { format: 'corrupted', data: null, usedFile, error: sqliteError.message };
                    }
                }
            }

            const text = await response.text();

            if (text.length === 0) {
                console.warn("下载的文件为空");
                return null;
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                console.error("JSON解析失败:", {
                    error: parseError.message,
                    textPreview: text.substring(0, 100),
                    textLength: text.length
                });
                throw new Error(`下载的数据JSON格式无效: ${parseError.message}`);
            }

            if (typeof data !== 'object' || data === null) {
                throw new Error("下载的数据格式无效 (非对象或为null)");
            }

            console.log("数据下载和验证成功:", {
                usedFile,
                recordsCount: data.records ? data.records.length : 0,
                drinksCount: data.drinks ? data.drinks.length : 0,
                hasUserSettings: !!data.userSettings,
                version: data.version,
                syncTimestamp: data.syncTimestamp
            });

            return { format: 'json', data, usedFile };
        } catch (error) {
            console.error("下载数据过程中发生错误:", {
                message: error.message,
                platform: this.platform,
                hasAuth: !!this.authHeader
            });
            throw error;
        }
    }

    async verifyRemoteSize(url, expectedSize) {
        const allowedDrift = Math.max(SIZE_MISMATCH_TOLERANCE_BYTES, expectedSize * SIZE_MISMATCH_TOLERANCE_RATIO);

        try {
            const fetchOptions = this.createFetchOptions('HEAD');
            const response = await this.executeRequest(url, fetchOptions, 'HEAD上传大小校验');

            if (!response.ok) {
                this.log(`大小校验跳过：HEAD返回 ${response.status} ${response.statusText}`, 'warn');
                return { supported: false };
            }

            const rawSize = response.headers?.get?.('content-length');
            if (!rawSize) {
                this.log('服务器未返回 Content-Length，无法校验上传文件大小', 'warn');
                return { supported: false };
            }

            const remoteSize = parseInt(rawSize, 10);
            if (!Number.isFinite(remoteSize) || remoteSize <= 0) {
                this.log(`Content-Length 无效: ${rawSize}`, 'warn');
                return { supported: false };
            }

            const delta = Math.abs(remoteSize - expectedSize);
            const mismatch = delta > allowedDrift;

            if (mismatch) {
                this.log(`警告：服务器文件大小(${remoteSize} bytes)与本地(${expectedSize} bytes)差异 ${delta} bytes，超出允许范围 ${allowedDrift} bytes`, 'warn');
            } else {
                this.log(`大小校验通过：服务器=${remoteSize} bytes，本地=${expectedSize} bytes`, 'info');
            }

            return { supported: true, mismatch, remoteSize, delta, allowedDrift };
        } catch (error) {
            this.log(`大小校验失败：${error.message}`, 'warn');
            return { supported: false, error: error.message };
        }
    }

    async uploadData(data) {
        this.log("开始上传数据...", 'info');

        if (!this.isConfigured()) {
            const error = "WebDAV未配置，无法上传数据";
            this.log(error, 'error');
            throw new Error(error);
        }

        if (typeof data !== 'object' || data === null) {
            const error = "无效的上传数据 (非对象)";
            this.log(error, 'error');
            throw new Error(error);
        }

        try {
            const sqliteBytes = await serializeDataToSQLiteBytes(data);
            
            // 压缩为 ZIP
            this.log("正在压缩数据库...", 'info');
            const zip = new JSZip();
            zip.file(this.dbFileName, sqliteBytes);
            
            // 使用 blob 类型，这是 fetch 上传二进制数据的标准方式
            // 避免使用 uint8array，因为某些 fetch 实现可能会将其视为文本进行错误编码
            const zipBlob = await zip.generateAsync({ 
                type: "blob", 
                compression: "DEFLATE",
                compressionOptions: { level: 9 }
            });
            
            const expectedSize = zipBlob.size;
            this.log(`ZIP压缩完成，大小: ${expectedSize} bytes`, 'info');
            const url = new URL(this.zipFileName, this.server);

            const uploadHeaders = {
                'Content-Type': 'application/zip'
            };

            // 尝试显式禁用 Chunked 和 Expect: 100-continue
            if (this.isNative) {
                uploadHeaders['Content-Length'] = `${expectedSize}`;
                uploadHeaders['Expect'] = '';
                uploadHeaders['Transfer-Encoding'] = 'identity';
                this.log('已显式设置 Content-Length 并禁用 Chunked/Expect 以避免截断问题 (原生)', 'info');
            } else {
                this.log('浏览器环境将自动设置 Content-Length，默认不发送 Expect/Chunked', 'info');
            }

            // 原生环境使用 CapacitorHttp，避免 WKWebView 对 PUT + Blob 的兼容性问题
            if (this.isNative) {
                const headers = this.createFetchOptions('PUT', uploadHeaders).headers;

                const base64Zip = arrayBufferToBase64(await zipBlob.arrayBuffer());
                const nativeResponse = await CapacitorHttp.request({
                    url: url.toString(),
                    method: 'PUT',
                    headers,
                    data: base64Zip,
                    dataType: 'base64',
                    responseType: 'text'
                });

                const status = nativeResponse.status ?? 0;
                const statusText = nativeResponse?.data && typeof nativeResponse.data === 'string'
                    ? nativeResponse.data.substring(0, 120)
                    : '';

                this.log(`原生上传响应: ${status} ${statusText || ''}`.trim(), status >= 200 && status < 300 ? 'info' : 'warn');

                if (status === 401) {
                    throw new Error("认证失败 (401): 用户名或密码错误");
                }

                if (status === 403) {
                    throw new Error("权限被拒绝 (403): 用户没有写入权限");
                }

                if (status === 507) {
                    throw new Error("存储空间不足 (507): 服务器空间已满");
                }

                if (!(status >= 200 && status < 300)) {
                    throw new Error(`上传数据失败: ${status} ${statusText || ''}`.trim());
                }

                this.log("数据上传成功 (ZIP, 原生)", 'success');
            } else {
                // Web 环境沿用 fetch
                const fetchOptions = this.createFetchOptions('PUT', uploadHeaders, zipBlob);

                const response = await this.executeRequest(url, fetchOptions, 'PUT上传数据(ZIP)');

                if (response.status === 401) {
                    throw new Error("认证失败 (401): 用户名或密码错误");
                }

                if (response.status === 403) {
                    throw new Error("权限被拒绝 (403): 用户没有写入权限");
                }

                if (response.status === 507) {
                    throw new Error("存储空间不足 (507): 服务器空间已满");
                }

                if (!response.ok) {
                    const error = `上传数据失败: ${response.status} ${response.statusText}`;
                    this.log(error, 'error');

                    try {
                        const responseText = await response.text();
                        if (responseText) {
                            this.log(`服务器错误详情: ${responseText}`, 'error');
                        }
                    } catch (textError) {
                        console.warn("无法读取错误响应:", textError.message);
                    }

                    throw new Error(error);
                }

                this.log("数据上传成功 (ZIP)", 'success');
            }

            const verifyResult = await this.verifyRemoteSize(url, expectedSize);
            if (verifyResult.supported && verifyResult.mismatch) {
                throw new Error("上传后服务器文件大小与本地不一致，疑似被截断。建议重试或更换 WebDAV 服务");
            }

            return { success: true, message: verifyResult.supported ? "数据上传成功（大小校验通过）" : "数据上传成功" };
        } catch (error) {
            this.log(`上传数据过程中发生错误: ${error.message}`, 'error');
            throw error;
        }
    }

    // 比较时间戳
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

    // 合并本地和远程数据
    mergeData(localData, remoteData, initialPresetDrinks = [], originalPresetDrinkIds = new Set()) {
        this.log("正在合并本地和远程数据...", 'info');
        
        // 打印合并前数据统计
        this.log(`本地数据状况: 记录=${localData?.records?.length || 0}, 饮品=${localData?.drinks?.length || 0}, 已删除=${localData?.deletedItems?.length || 0}`, 'info');
        this.log(`远程数据状况: 记录=${remoteData?.records?.length || 0}, 饮品=${remoteData?.drinks?.length || 0}, 已删除=${remoteData?.deletedItems?.length || 0}`, 'info');

        const localTs = localData?.syncTimestamp || localData?.userSettings?.localLastModifiedTimestamp || 0;
        const remoteTs = remoteData?.syncTimestamp || 0;

        const comparison = this.compareTimestamps(localTs, remoteTs);
        const isRemotePrimary = comparison === 'remote_newer' || comparison === 'only_remote';

        const primarySource = isRemotePrimary ? remoteData : localData;
        const secondarySource = isRemotePrimary ? localData : remoteData;
        const sourceInfo = isRemotePrimary 
            ? `远程 (时间戳: ${new Date(remoteTs).toLocaleTimeString()})` 
            : `本地 (时间戳: ${new Date(localTs).toLocaleTimeString()})`;
        
        this.log(`合并的主要来源: ${sourceInfo}`, 'info');

        // Merge Deleted Items
        const deletedMap = new Map();
        const allDeleted = [...(localData.deletedItems || []), ...(remoteData.deletedItems || [])];
        allDeleted.forEach(item => {
            if (!item || !item.id) return;
            const existing = deletedMap.get(item.id);
            if (!existing || (item.deletedAt || 0) > (existing.deletedAt || 0)) {
                deletedMap.set(item.id, item);
            }
        });
        const mergedDeletedItems = Array.from(deletedMap.values());
        this.log(`合并后的删除记录数: ${mergedDeletedItems.length}`, 'info');

        // Helper to check if item is deleted
        const isDeleted = (id, timestamp) => {
            const deletedItem = deletedMap.get(id);
            if (!deletedItem) return false;
            // If item timestamp is older than deletion timestamp, it is deleted.
            // If item timestamp is newer, it means it was re-created/updated after deletion.
            return (timestamp || 0) < (deletedItem.deletedAt || 0);
        };

        // 合并记录
        const recordMap = new Map();
        const allRecords = [...(localData.records || []), ...(remoteData.records || [])];
        let newRecordsCount = 0;
        allRecords.forEach(record => {
            if (!record || !record.id) {
                // console.warn("发现无效记录，已跳过:", record);
                return;
            }

            const tsCurrent = record.updatedAt || record.timestamp || 0;
            if (isDeleted(record.id, tsCurrent)) {
                return;
            }

            const existing = recordMap.get(record.id);
            if (existing) {
                const tsExisting = existing.updatedAt || existing.timestamp || 0;
                if (tsCurrent > tsExisting) {
                    recordMap.set(record.id, { ...record });
                } else if (tsCurrent === tsExisting && tsCurrent !== 0) {
                    const primaryRecords = primarySource.records || [];
                    if (primaryRecords.some(r => r.id === record.id && (r.updatedAt || r.timestamp || 0) === tsCurrent)) {
                        recordMap.set(record.id, { ...record });
                    }
                }
            } else {
                recordMap.set(record.id, { ...record });
                if (!localData.records?.some(r => r.id === record.id)) {
                    newRecordsCount++;
                }
            }
        });
        const mergedRecords = Array.from(recordMap.values());
        this.log(`合并后的记录数: ${mergedRecords.length} (新增/更新: ${newRecordsCount})`, 'info');

        // 合并饮品
        const drinkMap = new Map();
        const allDrinks = [...(localData.drinks || []), ...(remoteData.drinks || [])];

        allDrinks.forEach(drink => {
            if (!drink || !drink.id || typeof drink.name !== 'string') {
                // console.warn("发现无效饮品，已跳过:", drink);
                return;
            }

            const tsCurrent = drink.updatedAt || 0;
            if (isDeleted(drink.id, tsCurrent)) {
                return;
            }

            const existing = drinkMap.get(drink.id);
            if (existing) {
                const tsExisting = existing.updatedAt || 0;
                
                if (tsCurrent > tsExisting) {
                    drinkMap.set(drink.id, { ...drink });
                } else if (tsCurrent === tsExisting && tsCurrent !== 0) {
                    const primaryDrinks = primarySource.drinks || [];
                    if (primaryDrinks.some(d => d.id === drink.id && (d.updatedAt || 0) === tsCurrent)) {
                        drinkMap.set(drink.id, { ...drink });
                    }
                } else if (tsCurrent > 0 && tsExisting === 0) {
                    drinkMap.set(drink.id, { ...drink });
                } else if (tsExisting === 0 && tsCurrent === 0) {
                    const primaryDrinks = primarySource.drinks || [];
                    if (primaryDrinks.some(d => d.id === drink.id)) {
                        drinkMap.set(drink.id, { ...drink });
                    }
                }
            } else {
                drinkMap.set(drink.id, { ...drink });
            }
        });

        // 确保原始预设饮品存在
        initialPresetDrinks.forEach(presetDrink => {
            const existingDrink = drinkMap.get(presetDrink.id);
            if (originalPresetDrinkIds.has(presetDrink.id)) {
                if (!existingDrink) {
                    drinkMap.set(presetDrink.id, { ...presetDrink, updatedAt: presetDrink.updatedAt || 0, isPreset: true });
                } else {
                    drinkMap.set(presetDrink.id, { ...existingDrink, isPreset: true });
                }
            }
        });

        const mergedDrinks = Array.from(drinkMap.values())
            .filter(d => d && d.id && typeof d.name === 'string')
            .map(drink => {
                const isOriginalPreset = originalPresetDrinkIds.has(drink.id);
                const resolvedIsPreset = isOriginalPreset ? true : !!drink.isPreset;
                const presetDefinition = isOriginalPreset
                    ? initialPresetDrinks.find(p => p.id === drink.id)
                    : null;

                const resolvedCategory = drink.category || presetDefinition?.category || DEFAULT_CATEGORY;
                const iconColor = drink.iconColor
                    || presetDefinition?.iconColor
                    || getPresetIconColor(drink.id, resolvedCategory);

                return {
                    ...drink,
                    isPreset: resolvedIsPreset,
                    category: drink.category || (isOriginalPreset ? presetDefinition?.category : '其他'),
                    iconColor,
                };
            });

        this.log(`合并后的饮品数: ${mergedDrinks.length}`, 'info');

        // 合并用户设置
        // 个人参数、代谢与睡眠设置的同步也加上时间戳比较，新的覆盖旧的
        const localSettingsTs = localData?.userSettings?.localLastModifiedTimestamp || localData?.syncTimestamp || 0;
        const remoteSettingsTs = remoteData?.userSettings?.localLastModifiedTimestamp || remoteData?.syncTimestamp || 0;
        
        const settingsComparison = this.compareTimestamps(localSettingsTs, remoteSettingsTs);
        const isRemoteSettingsPrimary = settingsComparison === 'remote_newer' || settingsComparison === 'only_remote';
        
        this.log(`设置合并的主要来源: ${isRemoteSettingsPrimary ? '远程' : '本地'} (时间戳: ${isRemoteSettingsPrimary ? new Date(remoteSettingsTs).toLocaleTimeString() : new Date(localSettingsTs).toLocaleTimeString()})`, 'info');

        const mergedSettings = {};
        const settingsPrimary = (isRemoteSettingsPrimary ? remoteData?.userSettings : localData?.userSettings) || {};
        const settingsSecondary = (isRemoteSettingsPrimary ? localData?.userSettings : remoteData?.userSettings) || {};

        // 获取所有可能的设置键
        const allSettingKeys = new Set([
            ...Object.keys(settingsPrimary),
            ...Object.keys(settingsSecondary)
        ]);

        allSettingKeys.forEach(key => {
            // 跳过敏感或设备特定配置
            if (key === 'webdavPassword' || key === 'themeMode' || key === 'webdavEnabled' || key === 'webdavServer' || key === 'webdavUsername') {
                return;
            }

            // 优先使用主要来源（较新）的设置
            if (settingsPrimary.hasOwnProperty(key)) {
                // 特殊处理 develop 标志，确保它是布尔值
                if (key === 'develop' && typeof settingsPrimary[key] !== 'boolean') {
                    if (settingsSecondary.hasOwnProperty(key) && typeof settingsSecondary[key] === 'boolean') {
                        mergedSettings[key] = settingsSecondary[key];
                    } else {
                        mergedSettings[key] = false;
                    }
                } else {
                    mergedSettings[key] = settingsPrimary[key];
                }
            }
            // 如果主要来源没有，使用次要来源的
            else if (settingsSecondary.hasOwnProperty(key)) {
                if (key === 'develop' && typeof settingsSecondary[key] !== 'boolean') {
                    mergedSettings[key] = false;
                } else {
                    mergedSettings[key] = settingsSecondary[key];
                }
            }
        });

        // 保留本地WebDAV密码
        if (localData?.userSettings?.webdavPassword) {
            mergedSettings.webdavPassword = localData.userSettings.webdavPassword;
        }

        // 处理localLastModifiedTimestamp，取两者中最新的
        mergedSettings.localLastModifiedTimestamp = Math.max(localSettingsTs, remoteSettingsTs);

        const mergedResult = {
            records: mergedRecords.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
            drinks: mergedDrinks,
            userSettings: mergedSettings,
            deletedItems: mergedDeletedItems,
            syncTimestamp: Date.now(),
            version: primarySource.version || secondarySource.version || 'unknown'
        };
        console.log(`合并完成。新时间戳: ${mergedResult.syncTimestamp}`);
        return mergedResult;
    }

    // 执行同步操作
    async performSync(localData, initialPresetDrinks = [], originalPresetDrinkIds = new Set(), forceDownload = false) {
        this.log("=== 开始WebDAV同步过程 ===", 'info');
        
        if (!this.isConfigured()) {
            const error = "WebDAV未配置";
            this.log(`同步中止: ${error}`, 'error');
            return {
                success: false,
                message: error,
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
            let remoteResult = null;
            let remoteData = null;
            try {
                remoteResult = await this.downloadData();
                remoteData = remoteResult?.data || remoteResult;
                
                if (remoteData) {
                    this.log(`远程数据下载成功 (格式: ${remoteResult?.format})`, 'success');
                } else {
                    this.log("远程无数据 (首次同步)", 'info');
                }
            } catch (downloadError) {
                this.log(`下载远程数据失败: ${downloadError.message}`, 'error');

                // 如果是强制下载且下载失败，则直接报错
                if (forceDownload) {
                    throw new Error(`强制下载失败: ${downloadError.message}`);
                }

                // 特殊处理：如果错误是 "database disk image is malformed"，说明远程文件损坏
                // 此时我们不应该报错，而应该将其视为 corrupted 状态，允许后续逻辑进行自愈（上传本地数据）
                if (downloadError.message && downloadError.message.includes('malformed')) {
                    this.log("捕获到 malformed 错误，视为远程文件损坏，将尝试自愈", 'warn');
                    remoteResult = { format: 'corrupted' };
                    // 继续执行后续逻辑，不要 return
                } else {
                    // 检查是否可以进行初始上传
                    if (!localTs && (currentLocalData.records?.length > 0 || currentLocalData.drinks?.length > 0 ||
                        Object.keys(currentLocalData.userSettings || {}).filter(k => k !== 'webdavPassword').length > 0)) {
                        this.log("下载失败，但本地数据似乎是新的，尝试初始上传", 'warn');
                        try {
                            const uploadTimestamp = localTs || Date.now();
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

                            this.log("初始上传成功", 'success');
                            return {
                                success: true,
                                message: "首次同步或本地较新：已上传本地数据",
                                data: returnData,
                                timestamp: uploadTimestamp
                            };
                        } catch (uploadError) {
                            this.log(`初始上传也失败: ${uploadError.message}`, 'error');
                            return {
                                success: false,
                                message: `同步失败：无法下载远程数据且上传初始数据失败 (${uploadError.message})`,
                                data: null,
                                timestamp: null
                            };
                        }
                    } else {
                        return {
                            success: false,
                            message: `同步失败：无法下载远程数据 (${downloadError.message})`,
                            data: null,
                            timestamp: null
                        };
                    }
                }
            }

            // 如果是强制下载，直接使用远程数据
            if (forceDownload) {
                this.log("执行操作: 强制下载 (覆盖本地数据)", 'warn');
                if (!remoteData) {
                    throw new Error("远程没有数据可供下载");
                }
                
                let finalData = { ...remoteData };
                
                // 恢复本地的关键配置
                if (localData?.userSettings) {
                    if (!finalData.userSettings) finalData.userSettings = {};
                    
                    // 保留WebDAV配置
                    if (localData.userSettings.webdavPassword) finalData.userSettings.webdavPassword = localData.userSettings.webdavPassword;
                    if (localData.userSettings.webdavServer) finalData.userSettings.webdavServer = localData.userSettings.webdavServer;
                    if (localData.userSettings.webdavUsername) finalData.userSettings.webdavUsername = localData.userSettings.webdavUsername;
                    if (localData.userSettings.webdavEnabled) finalData.userSettings.webdavEnabled = localData.userSettings.webdavEnabled;
                    
                    // 保留主题设置
                    if (localData.userSettings.themeMode) finalData.userSettings.themeMode = localData.userSettings.themeMode;
                }

                return {
                    success: true,
                    message: "同步成功：已强制从服务器下载并覆盖本地数据",
                    data: finalData,
                    timestamp: finalData.syncTimestamp
                };
            }

            // 如果远程文件损坏，视为无远程数据，允许本地数据上传修复
            if (remoteResult?.format === 'corrupted') {
                this.log('远程文件损坏，使用本地数据进行自愈上传', 'warn');
                remoteData = null;
            }

            // 判断数据是否有意义（非空）
            const isLocalDataMeaningful = (currentLocalData.records?.length > 0) || 
                                         (currentLocalData.drinks?.length > 0) || 
                                         (Object.keys(currentLocalData.userSettings || {}).filter(k => 
                                             k !== 'webdavPassword' && 
                                             k !== 'themeMode' && 
                                             k !== 'webdavEnabled' && 
                                             k !== 'webdavServer' && 
                                             k !== 'webdavUsername'
                                         ).length > 0);

            const isRemoteDataMeaningful = remoteData && (
                (remoteData.records?.length > 0) || 
                (remoteData.drinks?.length > 0) || 
                (Object.keys(remoteData.userSettings || {}).filter(k => 
                    k !== 'webdavPassword' && 
                    k !== 'themeMode' && 
                    k !== 'webdavEnabled' && 
                    k !== 'webdavServer' && 
                    k !== 'webdavUsername'
                ).length > 0)
            );

            // 比较并决定操作
            const remoteTs = remoteData?.syncTimestamp || null;
            let comparison = this.compareTimestamps(localTs, remoteTs);

            // 如果本地没有意义的数据（如刚清除或新安装），而远程有数据，则强制视为远程较新
            if (!isLocalDataMeaningful && isRemoteDataMeaningful) {
                 this.log("检测到本地数据为空且远程有有效数据: 强制视为远程数据较新，以从服务器同步数据", 'warn');
                 comparison = 'remote_newer';
            }

            this.log(`时间戳比较结果: ${comparison} (本地: ${localTs}, 远程: ${remoteTs})`, 'info');

            let finalData = null;
            let message = "";
            let action = "none";

            // 根据比较结果和数据有效性执行操作
            switch (comparison) {
                case 'local_newer':
                case 'only_local':
                    // 如果本地数据为空但远程有数据，不要上传空数据
                    if (!isLocalDataMeaningful && isRemoteDataMeaningful) {
                        action = "download";
                        this.log("执行操作: 使用远程数据 (本地为空，远程有内容)", 'info');
                        finalData = this.mergeData(currentLocalData, remoteData, initialPresetDrinks, originalPresetDrinkIds);
                        message = "同步成功：已从服务器下载数据";
                    } else if (isLocalDataMeaningful) {
                        // 修改：即使本地较新，也执行合并，以防止远程有本地没有的记录（例如来自其他设备）
                        // 只有当远程完全为空时，才直接上传
                        if (isRemoteDataMeaningful) {
                            action = "merge";
                            this.log("执行操作: 合并本地和远程数据 (本地较新，但远程也有数据)", 'info');
                            finalData = this.mergeData(currentLocalData, remoteData, initialPresetDrinks, originalPresetDrinkIds);
                            await this.uploadData(finalData);
                            message = "同步成功：已合并本地和远程数据";
                        } else {
                            action = "upload";
                            this.log("执行操作: 上传本地数据 (本地较新或仅本地存在)", 'info');
                            const uploadTs = localTs || Date.now();
                            finalData = {
                                ...currentLocalData,
                                syncTimestamp: uploadTs,
                                userSettings: { ...(currentLocalData.userSettings || {}) }
                            };
                            await this.uploadData(finalData);
                            message = "同步成功：本地数据已上传";
                        }
                    } else {
                        // 本地和远程都为空
                        action = "no_action";
                        this.log("执行操作: 本地和远程都为空，无需操作", 'info');
                        finalData = currentLocalData;
                        message = "同步完成：无数据需要同步";
                    }
                    if (localData?.userSettings?.webdavPassword && finalData.userSettings) {
                        finalData.userSettings.webdavPassword = localData.userSettings.webdavPassword;
                    }
                    break;

                case 'remote_newer':
                case 'only_remote':
                    action = "merge";
                    this.log("执行操作: 合并本地和远程数据（远程较新或仅远程存在）", 'info');
                    finalData = this.mergeData(currentLocalData, remoteData, initialPresetDrinks, originalPresetDrinkIds);
                    // 只有在合并后的数据有意义时才上传
                    const isMergedDataMeaningful = (finalData.records?.length > 0) || (finalData.drinks?.length > 0);
                    if (isMergedDataMeaningful) {
                        await this.uploadData(finalData);
                        message = "同步成功：已合并本地和远程数据";
                    } else {
                        message = "同步成功：已下载远程数据";
                    }
                    break;

                case 'equal':
                    action = "merge";
                    this.log("执行操作: 时间戳相等，执行合并以确保数据一致性", 'info');
                    finalData = this.mergeData(currentLocalData, remoteData, initialPresetDrinks, originalPresetDrinkIds);
                    // 检查是否需要上传
                    const needsUpload = isLocalDataMeaningful || isRemoteDataMeaningful;
                    if (needsUpload) {
                        await this.uploadData(finalData);
                        message = "同步成功：数据已合并/验证";
                    } else {
                        message = "同步完成：无数据需要同步";
                    }
                    break;

                case 'no_timestamps':
                    // 无时间戳时，优先保留有数据的一方
                    if (isRemoteDataMeaningful && !isLocalDataMeaningful) {
                        action = "download";
                        this.log("执行操作: 使用远程数据 (无时间戳，远程有数据，本地为空)", 'info');
                        finalData = { ...remoteData };
                        if (localData?.userSettings?.webdavPassword) {
                            finalData.userSettings = {
                                ...finalData.userSettings,
                                webdavPassword: localData.userSettings.webdavPassword
                            };
                        }
                        message = "同步成功：已从服务器下载数据";
                    } else if (isLocalDataMeaningful && !isRemoteDataMeaningful) {
                        action = "upload";
                        this.log("执行操作: 上传本地数据 (无时间戳，本地有数据，远程为空)", 'info');
                        finalData = {
                            ...currentLocalData,
                            syncTimestamp: Date.now(),
                            userSettings: { ...(currentLocalData.userSettings || {}) }
                        };
                        await this.uploadData(finalData);
                        message = "同步成功：本地数据已上传";
                    } else if (isLocalDataMeaningful && isRemoteDataMeaningful) {
                        action = "merge";
                        this.log("执行操作: 合并数据 (无时间戳，本地和远程都有数据)", 'info');
                        finalData = this.mergeData(currentLocalData, remoteData, initialPresetDrinks, originalPresetDrinkIds);
                        await this.uploadData(finalData);
                        message = "同步成功：无时间戳数据已合并";
                    } else {
                        action = "no_action";
                        this.log("执行操作: 本地和远程都为空，无需操作", 'info');
                        finalData = currentLocalData;
                        message = "同步完成：无数据需要同步";
                    }
                    if (localData?.userSettings?.webdavPassword && finalData.userSettings && !finalData.userSettings.webdavPassword) {
                        finalData.userSettings.webdavPassword = localData.userSettings.webdavPassword;
                    }
                    break;

                default:
                    action = "no_action";
                    this.log("执行操作: 未定义的时间戳比较结果，未执行操作", 'warn');
                    finalData = currentLocalData;
                    message = "同步警告：无法确定操作，未更改数据";
                    if (localData?.userSettings?.webdavPassword && finalData.userSettings && !finalData.userSettings.webdavPassword) {
                        finalData.userSettings.webdavPassword = localData.userSettings.webdavPassword;
                    }
            }

            this.log(`同步操作完成: ${action}`, 'success');

            return {
                success: true,
                message: message,
                data: finalData,
                timestamp: finalData?.syncTimestamp || localTs
            };

        } catch (error) {
            this.log(`同步过程中发生严重错误: ${error.message}`, 'error');

            // 返回本地数据防止数据丢失
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
        } finally {
            this.log("=== WebDAV同步过程结束 ===", 'info');
        }
    }
}
