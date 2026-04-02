import { EmotionData } from '../types';

// Define what a single row in our database looks like
export interface EmotionRecord {
    id?: number; // Auto-incrementing ID
    timestamp: number;
    emotions: EmotionData;
}

const DB_NAME = 'EmotionDiaryDB';
const STORE_NAME = 'scans';
const DB_VERSION = 1;

// Initialize the Database
export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => resolve(request.result);

        // This runs the very first time the app opens, or if we change DB_VERSION
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Create a table called 'scans', ordered by a hidden 'id', and index by 'timestamp'
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
};

// Write a new scan to the database
export const saveScanToDB = async (emotions: EmotionData): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const record: EmotionRecord = {
            timestamp: Date.now(),
            emotions
        };

        const request = store.add(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Read all scans from the last X hours
export const getRecentScans = async (hoursBack: number = 24): Promise<EmotionRecord[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');

        const timeThreshold = Date.now() - (hoursBack * 60 * 60 * 1000);
        const range = IDBKeyRange.lowerBound(timeThreshold);

        const request = index.getAll(range);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Optional: Clear database (useful for debugging or a "Reset App" button)
export const clearDB = async (): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};