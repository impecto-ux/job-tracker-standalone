"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { UserManagementPanel } from '@/components/job-tracker/UserManagementPanel';

export default function UserManagementPage() {
    const router = useRouter();

    return (
        <UserManagementPanel onClose={() => router.back()} initialView="root" />
    );
}
