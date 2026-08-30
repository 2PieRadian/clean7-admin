import { getGatewayUrl } from "./env";
import { getStoredSession } from "./browser-session";

export async function uploadCategoryImage(
  file: File,
  imageVariant: "app" | "web" | "general" = "general",
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!file) {
    throw new Error("No file provided");
  }

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
