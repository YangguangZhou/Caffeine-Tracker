const DB_NAME = 'CaffeineTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyvalue';

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const getDBValue = async (key) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => {
        console.error(`Error getting key ${key} from DB`);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  } catch (error) {
    console.error("Failed to get value from DB:", error);
    return null;
  }
};

export const setDBValue = async (key, value) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onerror = () => {
        console.error(`Error setting key ${key} in DB`);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  } catch (error) {
    console.error("Failed to set value in DB:", error);
  }
};

export const exportDatabase = async () => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const keysRequest = store.getAllKeys();

      keysRequest.onerror = () => reject(keysRequest.error);

      keysRequest.onsuccess = () => {
        const keys = keysRequest.result;
        const valuesRequest = store.getAll();

        valuesRequest.onerror = () => reject(valuesRequest.error);

        valuesRequest.onsuccess = () => {
          const values = valuesRequest.result;
          const exportData = {};
          keys.forEach((key, i) => {
            exportData[key] = values[i];
          });
          resolve(exportData);
        };
      };
    });
  } catch (error) {
    console.error("Failed to export DB:", error);
    throw error;
  }
};

export const importDatabase = async (data) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      Object.keys(data).forEach(key => {
        store.put(data[key], key);
      });
    });
  } catch (error) {
    console.error("Failed to import DB:", error);
    throw error;
  }
};
