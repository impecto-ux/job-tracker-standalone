"use server";

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const SUBS_FILE = path.join(DATA_DIR, 'subscriptions.json');

export interface Subscription {
    id: string;
    name: string;
    amount: number;
    category: string;
    renewalDay: number; // 1-31
    isActive: boolean;
    lastProcessedMonth?: string; // Format: "YYYY-MM"
}

async function ensureDB() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }

    try {
        await fs.access(SUBS_FILE);
    } catch {
        await fs.writeFile(SUBS_FILE, '[]');
    }
}

export async function getSubscriptions(): Promise<Subscription[]> {
    await ensureDB();
    try {
        const data = await fs.readFile(SUBS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

export async function saveSubscriptions(subs: Subscription[]): Promise<void> {
    await ensureDB();
    await fs.writeFile(SUBS_FILE, JSON.stringify(subs, null, 2));
}
