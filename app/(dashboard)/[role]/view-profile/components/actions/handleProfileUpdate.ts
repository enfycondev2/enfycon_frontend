'use server';

import { serverApiClient } from "@/lib/serverApiClient";
import { revalidatePath } from "next/cache";

export async function handleProfileUpdate(formData: FormData) {
    const fullName = formData.get('name') as string;
    const phone = formData.get('number') as string;
    const language = formData.get('language') as string;
    const bio = formData.get('desc') as string;

    try {
        const res = await serverApiClient('/auth/me/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, phone, language, bio }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('[handleProfileUpdate] Failed:', err);
            return { success: false, message: err?.message || 'Failed to update profile.' };
        }

        revalidatePath('/admin/view-profile');
        revalidatePath('/[role]/view-profile');

        return { success: true, message: 'Profile updated successfully.' };
    } catch (error: any) {
        console.error('[handleProfileUpdate] Error:', error);
        return { success: false, message: 'An error occurred. Please try again.' };
    }
}
