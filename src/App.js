import React from "react";
import { useAuth } from "./hooks/useAuth";
import { useMessages } from "./hooks/useMessage";
import Login from "./components/Login";
import Header from "./components/Header";
import MessageList from "./components/MessageList";
import MessageInput from "./components/MessageInput";
import "./App.css";

function App() {
  const { user, loading, login, logout } = useAuth();
  const { messages, sendMessage } = useMessages();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="app">
      <Header user={user} onLogout={logout} />
      <main className="main-content">
        <MessageList messages={messages} currentUser={user} />
        <MessageInput onSendMessage={sendMessage} user={user} />
      </main>
    </div>
  );
}

export default App;