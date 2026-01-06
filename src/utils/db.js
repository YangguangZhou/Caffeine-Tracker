import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

const DB_FILE_NAME = 'caffeine-tracker.sqlite';
const WEB_IDB_NAME = 'caffeine-tracker-sqlite';
const WEB_IDB_STORE = 'files';
const USER_SETTINGS_KEY = 'userSettings';
const PASSWORD_KEY = 'webdavPassword';

let sqlPromise = null;
let dbInstance = null;

const toBytes = (base64) => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const toBase64 = (bytes) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const openWebIdb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(WEB_IDB_NAME, 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(WEB_IDB_STORE)) db.createObjectStore(WEB_IDB_STORE);
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const loadWebFile = async () => {
  const db = await openWebIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WEB_IDB_STORE, 'readonly');
    const store = tx.objectStore(WEB_IDB_STORE);
    const getReq = store.get(DB_FILE_NAME);
    getReq.onsuccess = () => resolve(getReq.result || null);
    getReq.onerror = () => reject(getReq.error);
  });
};

const saveWebFile = async (bytes) => {
  const db = await openWebIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WEB_IDB_STORE, 'readwrite');
    const store = tx.objectStore(WEB_IDB_STORE);
    store.put(bytes, DB_FILE_NAME);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const locateSqlWasm = (file) => {
  if (file === 'sql-wasm.wasm') return wasmUrl;
  return file;
};

const getSql = () => {
  if (!sqlPromise) sqlPromise = initSqlJs({ locateFile: locateSqlWasm });
  return sqlPromise;
};

const ensureSchema = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      name TEXT,
      amount REAL,
      volume REAL,
      timestamp INTEGER,
      drinkId TEXT,
      customName TEXT,
      customAmount REAL,
      updatedAt INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_records_timestamp ON records(timestamp);
    CREATE TABLE IF NOT EXISTS drinks (
      id TEXT PRIMARY KEY,
      name TEXT,
      calculationMode TEXT,
      caffeineContent REAL,
      caffeinePerGram REAL,
      defaultVolume REAL,
      category TEXT,
      isPreset INTEGER,
      iconColor TEXT,
      updatedAt INTEGER
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS deleted_items (
      id TEXT PRIMARY KEY,
      type TEXT,
      deletedAt INTEGER
    );
  `);
};

const loadExistingBytes = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const { data } = await Filesystem.readFile({ path: DB_FILE_NAME, directory: Directory.Data });
      return toBytes(data);
    } catch (err) {
      return null;
    }
  }
  return loadWebFile();
};

const persistBytes = async (bytes) => {
  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({ path: DB_FILE_NAME, directory: Directory.Data, data: toBase64(bytes) });
  } else {
    await saveWebFile(bytes);
  }
};

const getDatabase = async () => {
  if (dbInstance) return dbInstance;
  const SQL = await getSql();
  const existing = await loadExistingBytes();
  dbInstance = existing ? new SQL.Database(existing) : new SQL.Database();
  ensureSchema(dbInstance);
  if (!existing) await persistBytes(dbInstance.export());
  return dbInstance;
};

const run = (db, sql, params = []) => {
  const statement = db.prepare(sql);
  try {
    statement.run(params);
  } finally {
    statement.free();
  }
};

const selectAll = (db, sql, params = []) => {
  const statement = db.prepare(sql);
  const rows = [];
  try {
    if (params && params.length) statement.bind(params);
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
};

const persistDb = async (db) => {
  const bytes = db.export();
  await persistBytes(bytes);
};

const trackDeletion = async (id, type) => {
  const db = await getDatabase();
  run(db, 'INSERT OR REPLACE INTO deleted_items (id, type, deletedAt) VALUES (?, ?, ?)', [id, type, Date.now()]);
  await persistDb(db);
};

const hydrateRecord = (row) => ({
  ...row,
  amount: row.amount ? Number(row.amount) : 0,
  volume: row.volume !== null ? Number(row.volume) : null,
  timestamp: row.timestamp ? Number(row.timestamp) : 0,
  customAmount: row.customAmount !== null ? Number(row.customAmount) : null,
  updatedAt: row.updatedAt ? Number(row.updatedAt) : null
});

const hydrateDrink = (row) => ({
  ...row,
  caffeineContent: row.caffeineContent !== null ? Number(row.caffeineContent) : null,
  caffeinePerGram: row.caffeinePerGram !== null ? Number(row.caffeinePerGram) : null,
  defaultVolume: row.defaultVolume !== null ? Number(row.defaultVolume) : null,
  isPreset: row.isPreset ? Boolean(row.isPreset) : false,
  updatedAt: row.updatedAt ? Number(row.updatedAt) : null
});

const hydrateDeleted = (row) => ({ ...row, deletedAt: row.deletedAt ? Number(row.deletedAt) : null });

export const getAllRecords = async () => {
  const db = await getDatabase();
  const rows = selectAll(db, 'SELECT * FROM records ORDER BY timestamp DESC');
  return rows.map(hydrateRecord);
};

export const addRecord = async (record) => {
  const db = await getDatabase();
  run(db, 'INSERT OR REPLACE INTO records (id, name, amount, volume, timestamp, drinkId, customName, customAmount, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    record.id,
    record.name || '',
    record.amount ?? 0,
    record.volume ?? null,
    record.timestamp ?? Date.now(),
    record.drinkId || null,
    record.customName || null,
    record.customAmount ?? null,
    record.updatedAt ?? Date.now()
  ]);
  await persistDb(db);
};

export const updateRecord = addRecord;

export const deleteRecord = async (id) => {
  const db = await getDatabase();
  await trackDeletion(id, 'record');
  run(db, 'DELETE FROM records WHERE id = ?', [id]);
  await persistDb(db);
};

export const getAllDrinks = async () => {
  const db = await getDatabase();
  const rows = selectAll(db, 'SELECT * FROM drinks ORDER BY name COLLATE NOCASE ASC');
  return rows.map(hydrateDrink);
};

export const saveDrink = async (drink) => {
  const db = await getDatabase();
  run(db, 'INSERT OR REPLACE INTO drinks (id, name, calculationMode, caffeineContent, caffeinePerGram, defaultVolume, category, isPreset, iconColor, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    drink.id,
    drink.name || '',
    drink.calculationMode || 'per100ml',
    drink.caffeineContent ?? null,
    drink.caffeinePerGram ?? null,
    drink.defaultVolume ?? null,
    drink.category || null,
    drink.isPreset ? 1 : 0,
    drink.iconColor || null,
    drink.updatedAt ?? Date.now()
  ]);
  await persistDb(db);
};

export const deleteDrink = async (id) => {
  const db = await getDatabase();
  await trackDeletion(id, 'drink');
  run(db, 'DELETE FROM drinks WHERE id = ?', [id]);
  await persistDb(db);
};

export const saveAllDrinks = async (drinks) => {
  const db = await getDatabase();
  db.exec('BEGIN TRANSACTION;');
  try {
    run(db, 'DELETE FROM drinks');
    drinks.forEach((drink) => {
      run(db, 'INSERT OR REPLACE INTO drinks (id, name, calculationMode, caffeineContent, caffeinePerGram, defaultVolume, category, isPreset, iconColor, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        drink.id,
        drink.name || '',
        drink.calculationMode || 'per100ml',
        drink.caffeineContent ?? null,
        drink.caffeinePerGram ?? null,
        drink.defaultVolume ?? null,
        drink.category || null,
        drink.isPreset ? 1 : 0,
        drink.iconColor || null,
        drink.updatedAt ?? Date.now()
      ]);
    });
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
  await persistDb(db);
};

export const getSettings = async () => {
  const db = await getDatabase();
  const rows = selectAll(db, 'SELECT value FROM settings WHERE key = ?', [USER_SETTINGS_KEY]);
  if (!rows.length) return null;
  try {
    return JSON.parse(rows[0].value);
  } catch (err) {
    console.warn('Failed to parse settings from DB', err);
    return null;
  }
};

export const saveSettings = async (settings) => {
  const db = await getDatabase();
  run(db, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [USER_SETTINGS_KEY, JSON.stringify(settings || {})]);
  await persistDb(db);
};

export const getWebDAVPassword = async () => {
  const db = await getDatabase();
  const rows = selectAll(db, 'SELECT value FROM settings WHERE key = ?', [PASSWORD_KEY]);
  return rows.length ? rows[0].value : null;
};

export const saveWebDAVPassword = async (password) => {
  const db = await getDatabase();
  if (password) {
    run(db, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [PASSWORD_KEY, password]);
  } else {
    run(db, 'DELETE FROM settings WHERE key = ?', [PASSWORD_KEY]);
  }
  await persistDb(db);
};

export const getDeletedItems = async () => {
  const db = await getDatabase();
  const rows = selectAll(db, 'SELECT * FROM deleted_items');
  return rows.map(hydrateDeleted);
};

export const exportDatabase = async () => {
  const [records, drinks, settings, webdavPassword, deletedItems] = await Promise.all([
    getAllRecords(),
    getAllDrinks(),
    getSettings(),
    getWebDAVPassword(),
    getDeletedItems()
  ]);

  return {
    records: records || [],
    drinks: drinks || [],
    userSettings: settings || {},
    webdavPassword: webdavPassword || null,
    deletedItems: deletedItems || []
  };
};

const importDataIntoInstance = (db, data) => {
  db.exec('BEGIN TRANSACTION;');
  try {
    run(db, 'DELETE FROM records');
    run(db, 'DELETE FROM drinks');
    run(db, 'DELETE FROM settings');
    run(db, 'DELETE FROM deleted_items');

    (data.records || data.caffeineRecords || []).forEach((r) => {
      if (!r || !r.id) return;
      run(db, 'INSERT OR REPLACE INTO records (id, name, amount, volume, timestamp, drinkId, customName, customAmount, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        r.id,
        r.name || '',
        r.amount ?? 0,
        r.volume ?? null,
        r.timestamp ?? Date.now(),
        r.drinkId || null,
        r.customName || null,
        r.customAmount ?? null,
        r.updatedAt ?? Date.now()
      ]);
    });

    (data.drinks || data.caffeineDrinks || []).forEach((d) => {
      if (!d || !d.id) return;
      run(db, 'INSERT OR REPLACE INTO drinks (id, name, calculationMode, caffeineContent, caffeinePerGram, defaultVolume, category, isPreset, iconColor, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        d.id,
        d.name || '',
        d.calculationMode || 'per100ml',
        d.caffeineContent ?? null,
        d.caffeinePerGram ?? null,
        d.defaultVolume ?? null,
        d.category || null,
        d.isPreset ? 1 : 0,
        d.iconColor || null,
        d.updatedAt ?? Date.now()
      ]);
    });

    const settings = data.userSettings || data.caffeineSettings || {};
    run(db, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [USER_SETTINGS_KEY, JSON.stringify(settings)]);

    if (data.webdavPassword) {
      run(db, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [PASSWORD_KEY, data.webdavPassword]);
    }

    (data.deletedItems || []).forEach((item) => {
      if (!item || !item.id) return;
      run(db, 'INSERT OR REPLACE INTO deleted_items (id, type, deletedAt) VALUES (?, ?, ?)', [
        item.id,
        item.type || null,
        item.deletedAt ?? Date.now()
      ]);
    });

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
};

export const importDatabase = async (data) => {
  const db = await getDatabase();
  importDataIntoInstance(db, data || {});
  await persistDb(db);
};

export const exportDatabaseBinary = async () => {
  const db = await getDatabase();
  return db.export();
};

export const importDatabaseBinary = async (bytes) => {
  const SQL = await getSql();
  dbInstance = new SQL.Database(bytes);
  ensureSchema(dbInstance);
  await persistDb(dbInstance);
};

export const serializeDataToSQLiteBytes = async (data) => {
  const SQL = await getSql();
  const tempDb = new SQL.Database();
  ensureSchema(tempDb);
  importDataIntoInstance(tempDb, data || {});
  return tempDb.export();
};

const readAllFromInstance = (db) => {
  const records = selectAll(db, 'SELECT * FROM records ORDER BY timestamp DESC').map(hydrateRecord);
  const drinks = selectAll(db, 'SELECT * FROM drinks ORDER BY name COLLATE NOCASE ASC').map(hydrateDrink);
  const settingsRow = selectAll(db, 'SELECT value FROM settings WHERE key = ?', [USER_SETTINGS_KEY]);
  const passwordRow = selectAll(db, 'SELECT value FROM settings WHERE key = ?', [PASSWORD_KEY]);
  const deletedItems = selectAll(db, 'SELECT * FROM deleted_items').map(hydrateDeleted);

  let userSettings = {};
  if (settingsRow.length) {
    try {
      userSettings = JSON.parse(settingsRow[0].value);
    } catch (err) {
      userSettings = {};
    }
  }

  return {
    records,
    drinks,
    userSettings,
    webdavPassword: passwordRow.length ? passwordRow[0].value : null,
    deletedItems
  };
};

export const deserializeSQLiteBytes = async (bytes) => {
  const SQL = await getSql();
  const tempDb = new SQL.Database(bytes);
  ensureSchema(tempDb);
  const all = readAllFromInstance(tempDb);
  tempDb.close();
  return all;
};

export const exportAllDataSnapshot = async () => {
  const db = await getDatabase();
  return readAllFromInstance(db);
};

// Legacy compatibility helpers
export const getDBValue = async (key) => {
  if (key === 'caffeineRecords') return getAllRecords();
  if (key === 'caffeineDrinks') return getAllDrinks();
  if (key === 'caffeineSettings') return getSettings();
  if (key === 'webdavPassword') return getWebDAVPassword();
  return null;
};

export const setDBValue = async (key, value) => {
  if (key === 'caffeineRecords') {
    await importDatabase({ records: value || [] });
    return;
  }
  if (key === 'caffeineDrinks') return saveAllDrinks(value || []);
  if (key === 'caffeineSettings') return saveSettings(value || {});
  if (key === 'webdavPassword') return saveWebDAVPassword(value);
};
