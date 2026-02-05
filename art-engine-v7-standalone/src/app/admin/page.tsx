"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const AdminDashboard = dynamic(
    () => import('@/components/job-tracker/AdminDashboard').then((mod) => mod.AdminDashboard),
    { ssr: false }
);

export default function AdminPage() {
    const router = useRouter();

    return (
        <div className="h-screen w-screen bg-black">
            <AdminDashboard onClose={() => router.push('/?app=jobtracker')} />
        </div>
    );
}
