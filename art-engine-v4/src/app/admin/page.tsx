"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminDashboard } from '@/components/job-tracker/AdminDashboard';

export default function AdminPage() {
    const router = useRouter();

    return (
        <div className="h-screen w-screen bg-black">
            <AdminDashboard onClose={() => router.push('/?app=jobtracker')} />
        </div>
    );
}
