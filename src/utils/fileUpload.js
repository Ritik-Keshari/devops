import Config from "../config";

export async function uploadFileToBackend(file) {
  const formData = new FormData();
  formData.append("file", file);

  console.log("UPLOAD TO URL:", `${Config.BACKEND}/api/file/upload`);

  try {
    const res = await fetch(`${Config.BACKEND}/api/file/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      console.error("UPLOAD FAILED:", res.status);
      console.error("RESPONSE:", await res.text());
      return null;
    }

    const data = await res.json();
    return data.url;
  } catch (error) {
    console.error("UPLOAD EXCEPTION:", error);
    return null;
  }
}

// ⭐ NEW FUNCTION: Upload Profile Picture
export async function uploadProfilePicture(file, username) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("username", username);

  try {
    const res = await fetch(Config.UPLOAD_PROFILE, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      console.error("PROFILE UPLOAD FAILED:", res.status);
      console.error(await res.text());
      return null;
    }

    const data = await res.json();
    return data.url;
  } catch (error) {
    console.error("PROFILE UPLOAD EXCEPTION:", error);
    return null;
  }
}
