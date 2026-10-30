const DB_NAME = 'lexicon-vi';
const DB_VERSION = 2;
const STORES = ['lists', 'entries', 'history'];

let dbPromise = null;
let memoryOnly = false;
const memory = new Map();

function openDatabase() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in self)) return reject(new Error('no-indexeddb'));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        for (const name of STORES) {
          if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('blocked'));
    }).catch(() => {
      memoryOnly = true;
      return null;
    });
    navigator.storage?.persist?.().catch(() => {});
  }
  return dbPromise;
}

function run(storeName, mode, action) {
  return openDatabase().then(database => new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = action(store);
    let result;
    if (request) request.onsuccess = () => { result = request.result; };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('aborted'));
  }));
}

const memStore = name => {
  if (!memory.has(name)) memory.set(name, new Map());
  return memory.get(name);
};

export async function getItem(storeName, key) {
  await openDatabase();
  if (memoryOnly) return memStore(storeName).get(key);
  return run(storeName, 'readonly', store => store.get(key));
}

export async function putItem(storeName, key, value) {
  await openDatabase();
  if (memoryOnly) { memStore(storeName).set(key, value); return; }
  await run(storeName, 'readwrite', store => store.put(value, key));
}

export async function getAllEntries(storeName) {
  await openDatabase();
  if (memoryOnly) return [...memStore(storeName).entries()];
  return new Promise((resolve, reject) => {
    openDatabase().then(database => {
      const pairs = [];
      const transaction = database.transaction(storeName, 'readonly');
      const request = transaction.objectStore(storeName).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        pairs.push([cursor.key, cursor.value]);
        cursor.continue();
      };
      transaction.oncomplete = () => resolve(pairs);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('aborted'));
    });
  });
}

export function storageMode() {
  return memoryOnly ? 'memory' : 'indexeddb';
}
