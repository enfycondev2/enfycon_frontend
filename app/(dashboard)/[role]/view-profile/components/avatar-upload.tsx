"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DefaultUploadedImage from "@/public/assets/images/user-grid/user-grid-img13.png";
import { apiClient } from "@/lib/apiClient";
import { Camera, Loader2 } from "lucide-react";
import { StaticImageData } from "next/image";
import React, { useRef, useState } from "react";

interface AvatarUploadProps {
    currentImage?: string | null;
}

const AvatarUpload = ({ currentImage }: AvatarUploadProps) => {
    const [imagePreview, setImagePreview] = useState<string | StaticImageData>(
        currentImage || DefaultUploadedImage
    );
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate size on client side (~750KB file = ~1MB base64)
        if (file.size > 750 * 1024) {
            setStatus("error");
            setTimeout(() => setStatus("idle"), 3000);
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setImagePreview(base64);
            setUploading(true);
            setStatus("idle");

            try {
                const res = await apiClient("/auth/me/profile-picture", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profilePicture: base64 }),
                });

                if (res.ok) {
                    setStatus("success");
                } else {
                    setStatus("error");
                    setImagePreview(currentImage || DefaultUploadedImage);
                }
            } catch {
                setStatus("error");
                setImagePreview(currentImage || DefaultUploadedImage);
            } finally {
                setUploading(false);
                setTimeout(() => setStatus("idle"), 3000);
            }
        };
        reader.readAsDataURL(file);
    };

    const previewSrc =
        typeof imagePreview === "string" ? imagePreview : imagePreview.src;

    return (
        <div className="avatar-upload">
            {/* Camera button */}
            <div className="avatar-edit absolute bottom-0 end-0 me-6 mt-4 z-[1] cursor-pointer">
                <Input
                    type="file"
                    id="imageUpload"
                    accept=".png, .jpg, .jpeg"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    hidden
                    disabled={uploading}
                />
                <Label
                    htmlFor="imageUpload"
                    className="w-8 h-8 flex justify-center items-center bg-blue-100 dark:bg-primary/25 text-primary dark:text-blue-400 border border-primary hover:bg-blue-100 text-lg rounded-full cursor-pointer"
                >
                    {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Camera className="w-4 h-4" />
                    )}
                </Label>
            </div>

            {/* Preview circle */}
            <div className="avatar-preview relative h-[150px] w-[150px] rounded-full border border-[#487FFF] shadow-md">
                <div
                    id="imagePreview"
                    className="h-full w-full rounded-full bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${previewSrc})` }}
                />
            </div>

            {/* Status message */}
            {status === "success" && (
                <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                    Profile picture saved!
                </p>
            )}
            {status === "error" && (
                <p className="mt-2 text-xs text-red-500">
                    Failed to save. Image must be under 750KB.
                </p>
            )}
        </div>
    );
};

export default AvatarUpload;
