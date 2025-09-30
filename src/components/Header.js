import React from "react";

const Header = ({ user, onLogout }) => {
  return (
    <header className="header">
      <div className="header-content">
        <h2>🔥 Firebase Chat</h2>
        <div className="user-info">
          <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
          <span className="user-name">{user.displayName}</span>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;