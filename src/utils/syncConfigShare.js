/**
 * WebDAV配置加密/解密和分享工具
 */

/**
 * 将 ArrayBuffer 转换为 Base64 字符串
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * 将 Base64 字符串转换为 ArrayBuffer
 * @param {string} base64
 * @returns {ArrayBuffer}
 */
function base64ToBuffer(base64) {
    // Base64 URL-safe decoding: replace spaces with '+'
    const base64Fixed = base64.replace(/ /g, '+');
    const binary_string = atob(base64Fixed);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}


/**
 * 将WebDAV配置信息编码为分享URL
 * @param {Object} config - WebDAV配置对象
 * @param {string} config.server - WebDAV服务器地址
 * @param {string} config.username - 用户名
 * @param {string} config.password - 密码
 * @returns {string} 分享URL
 */
export function encodeConfigToUrl(config) {
    try {
        const { server, username, password } = config;
        
        if (!server || !username || !password) {
            throw new Error('配置信息不完整');
        }

        // 创建配置对象
        const configData = {
            s: server,      // server
            u: username,    // username
            p: password,    // password
            t: Date.now()   // timestamp
        };

        // 转为JSON字符串，然后编码为 ArrayBuffer
        const jsonStr = JSON.stringify(configData);
        const buffer = new TextEncoder().encode(jsonStr).buffer;
        
        // 将 ArrayBuffer 编码为 Base64
        const base64 = bufferToBase64(buffer);
        
        // 生成完整URL
        const baseUrl = window.location.origin + window.location.pathname;
        const shareUrl = `${baseUrl}#/sync-import?config=${encodeURIComponent(base64)}`;
        
        return shareUrl;
    } catch (error) {
        console.error('编码配置失败:', error);
        throw new Error('生成分享链接失败');
    }
}

/**
 * 从URL解码WebDAV配置信息
 * @param {string} encodedConfig - Base64编码的配置字符串
 * @returns {Object|null} 解码后的配置对象
 */
export function decodeConfigFromUrl(encodedConfig) {
    try {
        if (!encodedConfig) {
            return null;
        }

        // 解码 URL 编码
        const decoded = decodeURIComponent(encodedConfig);
        
        // 将 Base64 解码为 ArrayBuffer
        const buffer = base64ToBuffer(decoded);

        // 将 ArrayBuffer 解码为字符串
        const jsonStr = new TextDecoder().decode(buffer);
        
        // 解析JSON
        const configData = JSON.parse(jsonStr);
        
        // 验证必要字段
        if (!configData.s || !configData.u || !configData.p) {
            throw new Error('配置数据不完整');
        }

        // 返回标准格式的配置对象
        return {
            server: configData.s,
            username: configData.u,
            password: configData.p,
            timestamp: configData.t
        };
    } catch (error) {
        console.error('解码配置失败:', error);
        return null;
    }
}

/**
 * 验证配置对象是否有效
 * @param {Object} config - 配置对象
 * @returns {boolean} 是否有效
 */
export function isValidConfig(config) {
    if (!config || typeof config !== 'object') {
        return false;
    }

    const { server, username, password } = config;
    
    // 检查必要字段
    if (!server || !username || !password) {
        return false;
    }

    // 检查服务器URL格式
    if (!server.startsWith('http://') && !server.startsWith('https://')) {
        return false;
    }

    return true;
}

/**
 * 隐藏密码,仅显示部分字符
 * @param {string} password - 密码
 * @returns {string} 隐藏后的密码
 */
export function maskPassword(password) {
    if (!password) return '';
    if (password.length <= 2) return '**';
    return password.substring(0, 2) + '*'.repeat(Math.min(password.length - 2, 6));
}

/**
 * 获取服务器显示名称(隐藏敏感信息)
 * @param {string} serverUrl - 服务器URL
 * @returns {string} 显示名称
 */
export function getServerDisplayName(serverUrl) {
    try {
        const url = new URL(serverUrl);
        return url.hostname;
    } catch {
        return serverUrl;
    }
}
