import React, { useState } from "react";
import { uploadProfilePicture } from "../utils/fileUpload";

export default function ProfileUpload({ username, onUploaded }) {
  const [preview, setPreview] = useState(null);

  const handleSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));

    const url = await uploadProfilePicture(file, username);
    if (url) {
      onUploaded(url); // update UI
    }
  };

  return (
    <div>
      <div className="profile-picture-container">
        <img
          src={preview || "/default-avatar.png"}
          alt="profile"
          className="profile-picture"
        />
      </div>

      <button
        className="upload-btn"
        onClick={() => document.getElementById("profileInput").click()}
      >
        Upload Profile Picture
      </button>

      <input
        id="profileInput"
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleSelect}
      />
    </div>
  );
}
