
'use server'

import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'expenses.json');

async function ensureDB() {
    try {
        await fs.access(path.dirname(DB_PATH));
    } catch {
        await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    }

    try {
        await fs.access(DB_PATH);
    } catch {
        await fs.writeFile(DB_PATH, '[]', 'utf-8');
    }
}

export async function getExpenses() {
    await ensureDB();
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

export async function saveExpenses(expenses: any[]) {
    await ensureDB();
    // Sanitize dates before saving (Next.js server actions serialization)
    const sanitized = expenses.map(e => ({
        ...e,
        date: typeof e.date === 'string' ? e.date : e.date.toISOString() // Store as ISO string
    }));

    await fs.writeFile(DB_PATH, JSON.stringify(sanitized, null, 2), 'utf-8');
    return { success: true };
}
