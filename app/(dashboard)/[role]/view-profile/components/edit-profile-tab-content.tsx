'use client';

import React, { useTransition, useState } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import AvatarUpload from './avatar-upload';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { handleProfileUpdate } from './actions/handleProfileUpdate';

const EditProfileTabContent = ({ user }: { user?: any }) => {
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const getDesignation = (roles: string[] = []) => {
        if (roles.includes('DELIVERY_HEAD')) return 'Delivery Head';
        if (roles.includes('POD_LEAD') || user?.isPodHead) return 'Pod Lead';
        if (roles.includes('RECRUITER')) return 'Recruiter';
        if (roles.includes('ACCOUNT_MANAGER')) return 'Account Manager';
        if (roles.includes('ADMIN')) return 'Admin';
        return '';
    };

    const designation = getDesignation(user?.roles);
    const department = "US Staffing";

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
            const result = await handleProfileUpdate(formData);
            setMessage({
                type: result.success ? 'success' : 'error',
                text: result.message,
            });
            setTimeout(() => setMessage(null), 4000);
        });
    };

    return (
        <div>
            <h6 className="text-base text-neutral-600 dark:text-neutral-200 mb-4">Profile Image</h6>
            <div className="mb-6 mt-4">
                <AvatarUpload currentImage={user?.profilePicture} />
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-x-6">
                    <div className="col-span-12 sm:col-span-6">
                        <div className="mb-5">
                            <Label htmlFor="name" className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2">
                                Full Name <span className="text-red-600">*</span>
                            </Label>
                            <Input name="name" type="text" id="name" placeholder="Enter Full Name" defaultValue={user?.fullName || ''} required />
                        </div>
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                        <div className="mb-5">
                            <Label htmlFor="email" className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2">
                                Email <span className="text-red-600">*</span>
                            </Label>
                            <Input name="email" type="email" id="email" placeholder="Enter email address" defaultValue={user?.email || ''} disabled className="opacity-60 cursor-not-allowed" />
                        </div>
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                        <div className="mb-5">
                            <Label htmlFor="number" className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2">Phone</Label>
                            <Input name="number" type="tel" id="number" placeholder="Enter phone number" defaultValue={user?.phone || ''} />
                        </div>
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                        <div className="mb-5">
                            <Label htmlFor="department" className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2">Department</Label>
                            <Input name="department" id="department" placeholder="Enter Department" defaultValue={department} disabled className="opacity-60 cursor-not-allowed" />
                        </div>
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                        <div className="mb-5">
                            <Label htmlFor="designation" className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2">Designation</Label>
                            <Input name="designation" id="designation" placeholder="Enter Designation" defaultValue={designation} disabled className="opacity-60 cursor-not-allowed" />
                        </div>
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                        <div className="mb-5">
                            <Label htmlFor="language" className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2">Language</Label>
                            <Input name="language" id="language" placeholder="Enter Language" defaultValue={user?.language || ''} />
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="mb-5">
                            <Label htmlFor="desc" className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2">Description</Label>
                            <Textarea name="desc" id="desc" placeholder="Write Description" defaultValue={user?.bio || ''} />
                        </div>
                    </div>
                </div>

                {message && (
                    <p className={`text-sm text-center mb-3 ${message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        {message.text}
                    </p>
                )}

                <div className="flex items-center justify-center gap-3">
                    <Button type="reset" variant="outline" className="h-[48px] border border-red-600 bg-transparent hover:bg-red-600/20 text-red-600 text-base px-14 py-[11px] rounded-lg">
                        Cancel
                    </Button>
                    <Button type="submit" className="h-[48px] text-base px-14 py-3 rounded-lg" disabled={isPending}>
                        {isPending ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default EditProfileTabContent;
