"use server";

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

export interface UserSettings {
    monthlyBudget: number;
    currency: string;
}

const DEFAULT_SETTINGS: UserSettings = {
    monthlyBudget: 0,
    currency: 'TRY'
};

async function ensureDB() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }

    try {
        await fs.access(SETTINGS_FILE);
    } catch {
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    }
}

export async function getSettings(): Promise<UserSettings> {
    await ensureDB();
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return DEFAULT_SETTINGS;
    }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
    await ensureDB();
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
