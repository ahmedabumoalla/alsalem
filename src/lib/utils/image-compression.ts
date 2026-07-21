const MAX_DIMENSION = 1200;
const INITIAL_QUALITY = 0.72;
const MAX_SIZE_BYTES = 700 * 1024;

export class ImageCompressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageCompressionError";
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("فشل تحميل الصورة"));
    };
    img.src = url;
  });
}

function calculateDimensions(
  width: number,
  height: number
): { width: number; height: number } {
  const maxSide = Math.max(width, height);
  if (maxSide <= MAX_DIMENSION) {
    return { width, height };
  }
  const ratio = MAX_DIMENSION / maxSide;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function canvasToWebP(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("فشل ضغط الصورة"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("فشل قراءة الصورة"));
        reader.readAsDataURL(blob);
      },
      "image/webp",
      quality
    );
  });
}

function dataUrlSize(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}

export async function compressTransferReceipt(file: File): Promise<string> {
  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new ImageCompressionError(
      "نوع الملف غير مدعوم. الرجاء اختيار PNG أو JPG أو WEBP."
    );
  }

  const img = await loadImage(file);
  const { width, height } = calculateDimensions(img.naturalWidth, img.naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new ImageCompressionError("تعذر معالجة الصورة");
  }

  ctx.drawImage(img, 0, 0, width, height);

  let quality = INITIAL_QUALITY;
  let dataUrl = await canvasToWebP(canvas, quality);

  while (dataUrlSize(dataUrl) > MAX_SIZE_BYTES && quality > 0.1) {
    quality -= 0.1;
    dataUrl = await canvasToWebP(canvas, quality);
  }

  if (dataUrlSize(dataUrl) > MAX_SIZE_BYTES) {
    throw new ImageCompressionError(
      "تعذر حفظ الصورة بسبب كبر حجمها، الرجاء اختيار صورة أصغر."
    );
  }

  return dataUrl;
}
