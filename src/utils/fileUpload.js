import Config from "../config";

export async function uploadFileToBackend(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${Config.BACKEND}/file/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Upload failed: " + res.statusText);
    }

    // Backend should return { "url": "https://..." }
    const data = await res.json();

    return data.url;
  } catch (error) {
    console.error("File upload error:", error);
    return null;
  }
}
