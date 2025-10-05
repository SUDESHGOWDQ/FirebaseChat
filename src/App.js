import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import Chat from './components/Chat/Chat';
import Profile from './components/Profile/Profile';
import UserProfile from './components/Profile/UserProfile';
import GroupList from './components/Groups/GroupList/GroupList';
import CreateGroup from './components/Groups/CreateGroup/CreateGroup';
import GroupChat from './components/Groups/GroupChat/GroupChat';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import './App.scss';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Check if user document exists in Firestore
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            // Create user document if it doesn't exist
            console.log('Creating new user document for:', currentUser.email);
            await setDoc(userRef, {
              displayName: currentUser.displayName || '',
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || '',
              isOnline: true,
              lastSeen: new Date(),
              createdAt: new Date()
            });
          } else {
            // Update existing user to online
            console.log('Updating existing user to online:', currentUser.email);
            await updateDoc(userRef, {
              isOnline: true,
              lastSeen: new Date(),
              // Update profile info in case it changed
              displayName: currentUser.displayName || userSnap.data().displayName || '',
              photoURL: currentUser.photoURL || userSnap.data().photoURL || ''
            });
          }
        } catch (error) {
          console.error('Error updating user status:', error);
        }
      }
      
      setUser(currentUser);
      setLoading(false);
    });

    // Handle page visibility change to update online status
    const handleVisibilityChange = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        try {
          await updateDoc(userRef, {
            isOnline: !document.hidden,
            lastSeen: new Date()
          });
        } catch (error) {
          console.error('Error updating visibility status:', error);
        }
      }
    };

    // Handle beforeunload to set user offline
    const handleBeforeUnload = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        try {
          await updateDoc(userRef, {
            isOnline: false,
            lastSeen: new Date()
          });
        } catch (error) {
          console.error('Error setting user offline:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/dashboard" /> : <Register />} 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute user={user}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/chat/:friendId" 
            element={
              <ProtectedRoute user={user}>
                <Chat />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute user={user}>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user-profile/:userId" 
            element={
              <ProtectedRoute user={user}>
                <UserProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/groups" 
            element={
              <ProtectedRoute user={user}>
                <GroupList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/create-group" 
            element={
              <ProtectedRoute user={user}>
                <CreateGroup />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/group/:groupId" 
            element={
              <ProtectedRoute user={user}>
                <GroupChat />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/" 
            element={<Navigate to={user ? "/dashboard" : "/login"} />} 
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;