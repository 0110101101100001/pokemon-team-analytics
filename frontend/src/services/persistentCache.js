// Respostas da PokéAPI guardadas no IndexedDB entre visitas. Os dados quase nunca mudam,
// então a segunda visita abre fichas, golpes e itens sem rede. Sem IndexedDB (aba anônima,
// armazenamento bloqueado), tudo segue funcionando só com a rede.

const DB_NAME = 'smearglepedia-cache';
// Subir a versão descarta tudo o que foi guardado antes (ex.: mudança no formato salvo).
const DB_VERSION = 1;
const STORE = 'pokeapi';
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

let dbRequest = null;

function openDb() {
  dbRequest ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (db.objectStoreNames.contains(STORE)) db.deleteObjectStore(STORE);
        db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbRequest;
}

function run(mode, action) {
  return openDb().then((db) => new Promise((resolve) => {
    if (!db) return resolve(undefined);
    try {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  }));
}

/** O JSON salvo para a URL, ou undefined se não houver, estiver vencido ou o IndexedDB falhar. */
export async function readCached(url) {
  const entry = await run('readonly', (store) => store.get(url));
  if (!entry) return undefined;
  if (Date.now() - entry.savedAt > MAX_AGE_MS) {
    run('readwrite', (store) => store.delete(url));
    return undefined;
  }
  return entry.data;
}

export function writeCached(url, data) {
  run('readwrite', (store) => store.put({ savedAt: Date.now(), data }, url));
}
