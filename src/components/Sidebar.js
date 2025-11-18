import React from "react";

const Sidebar = ({ users, currentUser, selectedUser, onSelectUser }) => {
  return (
    <aside className="wa-sidebar">
      <div className="wa-top">
        <div className="wa-profile">
          <div className="wa-avatar">{currentUser.username[0].toUpperCase()}</div>
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
          .filter(u => u.username !== currentUser.username)
          .map(u => (
            <div
              key={u.username}
              className={`wa-user ${selectedUser === u.username ? "active" : ""}`}
              onClick={() => onSelectUser(u.username)}
            >
              <div className="wa-user-left">
                <div className="wa-avatar small">{u.username[0].toUpperCase()}</div>
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
