import React from "react";
import { uploadProfilePicture } from "../utils/fileUpload";

const Sidebar = ({ users, currentUser, selectedUser, onSelectUser, setCurrentUser }) => {

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

  // ⭐ FIXED — removed "normal"
  const Avatar = ({ url, letter, size = "" }) => {
    if (url) {
      return <img src={url} className={`wa-avatar-img ${size}`} alt="avatar" />;
    }
    return <div className={`wa-avatar ${size}`}>{letter}</div>;
  };

  return (
    <aside className="wa-sidebar">

      <div className="wa-top">
        <div className="wa-profile">

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

      <div className="wa-search">
        <input placeholder="Search or start new chat" />
      </div>

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
