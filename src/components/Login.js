import React from "react";

const Login = ({ onLogin }) => {
  return (
    <div className="login-container">
      <div className="login-box">
        <h2>🔥 Firebase Chat</h2>
        <p>Sign in to start chatting</p>
        <button className="login-btn" onClick={onLogin}>
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default Login;