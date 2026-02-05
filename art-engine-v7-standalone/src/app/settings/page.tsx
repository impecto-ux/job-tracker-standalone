"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserProfileModal from '@/components/auth/UserProfileModal';
import { useStore } from '@/lib/store';
import api from '@/lib/api';

export default function SettingsPage() {
    const router = useRouter();
    const auth = useStore(state => state.auth);

    // If no user, redirect to login
    useEffect(() => {
        if (!auth.token) {
            router.push('/login');
        }
    }, [auth.token, router]);

    if (!auth.user) return null;

    return (
        <UserProfileModal
            isOpen={true}
            onClose={() => router.back()}
            currentUser={auth.user}
            onUpdate={() => {
                api.get('/auth/me').then(res => auth.setUser(res.data));
            }}
        />
    );
}
