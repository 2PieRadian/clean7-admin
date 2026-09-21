import { getGatewayUrl } from "./env";
import { getStoredSession } from "./browser-session";

/**
 * Automatically resizes and compresses image files in browser using HTML5 Canvas
 * before uploading to S3, converting large 2-10MB camera/stock images to ~30-60KB WebP.
 */
export async function compressImageForUpload(
  file: File,
  maxDimension = 800,
  quality = 0.82
): Promise<File> {
  if (
    typeof window === "undefined" ||
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  ) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // If already small in both dimensions and file size, keep original
      if (width <= maxDimension && height <= maxDimension && file.size < 120 * 1024) {
        resolve(file);
        return;
      }

      // Calculate scaled dimensions keeping aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      const targetType = "image/webp";
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }

          const baseName = file.name.replace(/\.[^/.]+$/, "");
          const compressedFile = new File([blob], `${baseName}.webp`, {
            type: targetType,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        targetType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

export async function uploadCategoryImage(
  file: File,
  imageVariant: "app" | "web" | "general" = "general",
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!file) {
    throw new Error("No file provided");
  }

  // Automatically compress 2MB+ images to lightweight WebP before S3 upload
  file = await compressImageForUpload(file, 800, 0.82);

  const preSignedResponse = await fetch(
    `${getGatewayUrl()}/admin/upload/category-image`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getStoredSession()?.token ? { Authorization: `Bearer ${getStoredSession()?.token}` } : {})
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type || "image/png",
        imageVariant,
      }),
    }
  );

  if (!preSignedResponse.ok) {
    // Fallback to article-image upload if category-image endpoint is unavailable
    const fallbackResponse = await fetch(
      `${getGatewayUrl()}/admin/upload/article-image`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getStoredSession()?.token ? { Authorization: `Bearer ${getStoredSession()?.token}` } : {})
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || "image/png",
        }),
      }
    );

    if (!fallbackResponse.ok) {
      throw new Error("Failed to get pre-signed URL for image upload");
    }

    const fallbackData = await fallbackResponse.json();
    const { uploadURL, fileURL } = fallbackData.data;
    await putToSignedUrl(uploadURL, file, onProgress);
    return fileURL;
  }

  const responseData = await preSignedResponse.json();
  const { uploadURL, fileURL } = responseData.data;

  await putToSignedUrl(uploadURL, file, onProgress);
  return fileURL;
}

export async function uploadServiceImage(
  file: File,
  imageVariant: "app" | "web" | "general" = "general",
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!file) {
    throw new Error("No file provided");
  }

  // Automatically compress 2MB+ images to lightweight WebP before S3 upload
  file = await compressImageForUpload(file, 800, 0.82);

  const preSignedResponse = await fetch(
    `${getGatewayUrl()}/admin/upload/service-image`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getStoredSession()?.token ? { Authorization: `Bearer ${getStoredSession()?.token}` } : {})
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type || "image/png",
        imageVariant,
      }),
    }
  );

  if (!preSignedResponse.ok) {
    // Fallback to article-image upload if service-image endpoint is unavailable
    const fallbackResponse = await fetch(
      `${getGatewayUrl()}/admin/upload/article-image`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getStoredSession()?.token ? { Authorization: `Bearer ${getStoredSession()?.token}` } : {})
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || "image/png",
        }),
      }
    );

    if (!fallbackResponse.ok) {
      throw new Error("Failed to get pre-signed URL for image upload");
    }

    const fallbackData = await fallbackResponse.json();
    const { uploadURL, fileURL } = fallbackData.data;
    await putToSignedUrl(uploadURL, file, onProgress);
    return fileURL;
  }

  const responseData = await preSignedResponse.json();
  const { uploadURL, fileURL } = responseData.data;

  await putToSignedUrl(uploadURL, file, onProgress);
  return fileURL;
}

function putToSignedUrl(
  uploadURL: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadURL);
    xhr.setRequestHeader("Content-Type", file.type || "image/png");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress?.(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(file);
  });
}

export async function uploadStaffImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!file) {
    throw new Error("No file provided");
  }

  // Automatically compress 2MB+ images to lightweight WebP before S3 upload
  file = await compressImageForUpload(file, 800, 0.82);

  const preSignedResponse = await fetch(
    `${getGatewayUrl()}/admin/upload/staff-image`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getStoredSession()?.token ? { Authorization: `Bearer ${getStoredSession()?.token}` } : {})
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type || "image/png",
      }),
    }
  );

  if (!preSignedResponse.ok) {
    throw new Error("Failed to get pre-signed URL for staff image upload");
  }

  const responseData = await preSignedResponse.json();
  const { uploadURL, fileURL } = responseData.data;

  await putToSignedUrl(uploadURL, file, onProgress);
  return fileURL;
}
