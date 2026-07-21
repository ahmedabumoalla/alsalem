"use client";

import { useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  compressTransferReceipt,
  ImageCompressionError,
} from "@/lib/utils/image-compression";

interface ReceiptUploaderProps {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  onError: (message: string) => void;
}

export function ReceiptUploader({
  value,
  onChange,
  onError,
}: ReceiptUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const compressed = await compressTransferReceipt(file);
      onChange(compressed);
    } catch (error) {
      if (error instanceof ImageCompressionError) {
        onError(error.message);
      } else {
        onError("حدث خطأ أثناء معالجة الصورة");
      }
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onChange(undefined);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-dashed border-border bg-background p-6 text-center">
        {value ? (
          <div className="space-y-4">
            <div className="relative mx-auto max-w-sm overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="معاينة الحوالة"
                className="max-h-64 w-full object-contain"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
              حذف الصورة
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
              <ImageIcon className="h-7 w-7" />
            </div>
            <p className="text-sm text-muted">
              ارفع صورة الحوالة (PNG, JPG, WEBP) — اختياري
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {loading ? "جاري الضغط..." : "اختيار صورة"}
            </Button>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
