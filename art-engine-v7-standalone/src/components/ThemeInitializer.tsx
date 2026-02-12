'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export function ThemeInitializer() {
    const theme = useStore((state) => state.theme);

    useEffect(() => {
        console.log('ThemeInitializer: theme changed to:', theme);
        const root = document.documentElement;
        if (theme && theme !== 'echo') {
            root.setAttribute('data-theme', theme);
        } else {
            root.removeAttribute('data-theme');
        }
    }, [theme]);

    return null;
}
