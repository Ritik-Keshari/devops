import Config from "../config";

export async function uploadFileToBackend(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${Config.BACKEND}/api/file/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      console.log("STATUS:", res.status);
      console.log("TEXT:", await res.text());
      throw new Error("Upload failed");
    }

    const data = await res.json();
    return data.url;

  } catch (error) {
    console.error("File upload error:", error);
    return null;
  }
}
