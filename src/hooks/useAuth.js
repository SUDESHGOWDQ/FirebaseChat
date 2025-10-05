import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const updateUserStatus = useCallback(async (isOnline, userId = null) => {
    const currentUserId = userId || auth.currentUser?.uid;
    if (!currentUserId) return;

    try {
      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        isOnline,
        lastSeen: new Date()
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      setError(error.message);
    }
  }, []);

  const createUserDocument = useCallback(async (currentUser) => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          displayName: currentUser.displayName || '',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || '',
          isOnline: true,
          lastSeen: new Date(),
          createdAt: new Date()
        });
      } else {
        await updateDoc(userRef, {
          isOnline: true,
          lastSeen: new Date(),
          displayName: currentUser.displayName || userSnap.data().displayName || '',
          photoURL: currentUser.photoURL || userSnap.data().photoURL || ''
        });
      }
    } catch (error) {
      console.error('Error creating/updating user document:', error);
      setError(error.message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (auth.currentUser) {
        await updateUserStatus(false);
      }
      await signOut(auth);
    } catch (error) {
      console.error('Error during logout:', error);
      setError(error.message);
    }
  }, [updateUserStatus]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setError(null);
        if (currentUser) {
          await createUserDocument(currentUser);
        }
        setUser(currentUser);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    });

    // Handle page visibility change
    const handleVisibilityChange = () => {
      if (auth.currentUser) {
        updateUserStatus(!document.hidden);
      }
    };

    // Handle beforeunload to set user offline
    const handleBeforeUnload = () => {
      if (auth.currentUser) {
        updateUserStatus(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [createUserDocument, updateUserStatus]);

  return {
    user,
    loading,
    error,
    updateUserStatus,
    logout
  };
};