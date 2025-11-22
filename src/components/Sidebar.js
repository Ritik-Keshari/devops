import React from "react";
import { uploadProfilePicture } from "../utils/fileUpload";

const Sidebar = ({ users, currentUser, selectedUser, onSelectUser, setCurrentUser }) => {

  // Upload profile picture
  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = await uploadProfilePicture(file, currentUser.username);

    if (url) {
      setCurrentUser((prev) => ({
        ...prev,
        profileImageUrl: url,
      }));
    }
  };

  // ⭐ FINAL FIX — Avatar always forced 60x60 or 45x45
  const Avatar = ({ url, letter, size = "" }) => {
    const baseStyle = {
      borderRadius: "50%",
      objectFit: "cover",
      display: "block",
    };

    // Different size for main profile vs userlist
    const sizeStyle =
      size === "small"
        ? { width: 45, height: 45 }
        : { width: 60, height: 60 };

    // If image exists
    if (url) {
      return (
        <img
          src={url}
          alt="avatar"
          className={`wa-avatar-img ${size}`}
          style={{ ...baseStyle, ...sizeStyle }}   // ⭐ HARD ENFORCED
        />
      );
    }

    // Fallback letter avatar
    return (
      <div
        className={`wa-avatar ${size}`}
        style={{
          ...sizeStyle,
          ...baseStyle,
          background: "#ccc",
          fontWeight: "bold",
          justifyContent: "center",
          alignItems: "center",
          fontSize: size === "small" ? 18 : 24,
          display: "flex",
        }}
      >
        {letter}
      </div>
    );
  };

  return (
    <aside className="wa-sidebar">

      {/* TOP SECTION */}
      <div className="wa-top">
        <div className="wa-profile">

          {/* Click to Upload */}
          <div
            className="wa-avatar-wrapper"
            onClick={() => document.getElementById("profilePicInput").click()}
            style={{ cursor: "pointer" }}
            title="Click to change profile picture"
          >
            <Avatar
              url={currentUser.profileImageUrl}
              letter={currentUser.username[0].toUpperCase()}
            />
          </div>

          {/* Hidden file picker */}
          <input
            id="profilePicInput"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleProfilePicUpload}
          />

          <div>
            <div className="wa-username">{currentUser.username}</div>
            <div className="wa-status">Online</div>
          </div>

        </div>
      </div>

      {/* Search bar */}
      <div className="wa-search">
        <input placeholder="Search or start new chat" />
      </div>

      {/* User list */}
      <div className="wa-list">
        {users
          .filter((u) => u.username !== currentUser.username)
          .map((u) => (
            <div
              key={u.username}
              className={`wa-user ${selectedUser?.username === u.username ? "active" : ""}`}
              onClick={() => onSelectUser(u)}
            >
              <div className="wa-user-left">
                <Avatar
                  url={u.profileImageUrl}
                  letter={u.username[0].toUpperCase()}
                  size="small"
                />
              </div>

              <div className="wa-user-main">
                <div className="wa-user-top">
                  <div className="wa-user-name">{u.username}</div>
                  <div className="wa-user-time">Now</div>
                </div>
                <div className="wa-user-last">Tap to message</div>
              </div>
            </div>
          ))}
      </div>
    </aside>
  );
};

export default Sidebar;
