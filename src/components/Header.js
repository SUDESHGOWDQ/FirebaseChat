import React, { useState } from "react";

const Header = ({ user, onLogout, onlineUsers = [] }) => {
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);

  const toggleOnlineUsers = () => {
    setShowOnlineUsers(!showOnlineUsers);
  };

  return (
    <header className="header">
      <div className="header-content">
        <h2>🔥 Firebase Chat</h2>
        <div className="header-right">
          {/* Online Users Dropdown */}
          <div className="online-users-container">
            <button 
              className="online-users-btn" 
              onClick={toggleOnlineUsers}
              title={`${onlineUsers.length} users online`}
            >
              <span className="online-indicator">●</span>
              <span className="online-count">{onlineUsers.length}</span>
              <span className="dropdown-arrow">{showOnlineUsers ? '▲' : '▼'}</span>
            </button>
            
            {showOnlineUsers && (
              <div className="online-users-dropdown">
                <div className="dropdown-header">
                  <h4>Online Users ({onlineUsers.length})</h4>
                </div>
                <div className="users-list">
                  {onlineUsers.length > 0 ? (
                    onlineUsers.map((onlineUser) => (
                      <div key={onlineUser.id} className="online-user-item">
                        <img 
                          src={onlineUser.photoURL} 
                          alt={onlineUser.displayName} 
                          className="online-user-avatar" 
                        />
                        <div className="online-user-info">
                          <span className="online-user-name">{onlineUser.displayName}</span>
                          {onlineUser.id === user.uid && (
                            <span className="you-indicator">(You)</span>
                          )}
                        </div>
                        <div className="online-status">●</div>
                      </div>
                    ))
                  ) : (
                    <div className="no-users">No users online</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="user-info">
            <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
            <span className="user-name">{user.displayName}</span>
            <button className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
      
      {/* Overlay to close dropdown when clicking outside */}
      {showOnlineUsers && (
        <div 
          className="dropdown-overlay" 
          onClick={() => setShowOnlineUsers(false)}
        />
      )}
    </header>
  );
};

export default Header;