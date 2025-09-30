import { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  where,
  orderBy
} from "firebase/firestore";

export const useOnlineUsers = (currentUser) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setOnlineUsers([]);
      setLoading(false);
      return;
    }

    let unsubscribe;
    let userPresenceRef;

    const setupPresence = async () => {
      try {
        // Reference to the user's presence document
        userPresenceRef = doc(db, "presence", currentUser.uid);

        // Set user as online
        await setDoc(userPresenceRef, {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
          isOnline: true,
          lastSeen: serverTimestamp()
        });

        // Listen for all online users
        const presenceQuery = query(
          collection(db, "presence"),
          where("isOnline", "==", true),
          orderBy("displayName")
        );

        unsubscribe = onSnapshot(presenceQuery, (snapshot) => {
          const users = [];
          snapshot.forEach((doc) => {
            const userData = doc.data();
            users.push({
              id: doc.id,
              ...userData
            });
          });
          setOnlineUsers(users);
          setLoading(false);
        });

        // Set up cleanup for when user goes offline
        const handleBeforeUnload = () => {
          if (userPresenceRef) {
            // Use navigator.sendBeacon for better reliability
            navigator.sendBeacon(`https://firestore.googleapis.com/v1/projects/${db.app.options.projectId}/databases/(default)/documents/presence/${currentUser.uid}`, 
              JSON.stringify({
                writes: [{
                  delete: `projects/${db.app.options.projectId}/databases/(default)/documents/presence/${currentUser.uid}`
                }]
              })
            );
          }
        };

        // Listen for page visibility changes
        const handleVisibilityChange = async () => {
          if (document.hidden) {
            // User is going offline or switching tabs
            await setDoc(userPresenceRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName,
              email: currentUser.email,
              photoURL: currentUser.photoURL,
              isOnline: false,
              lastSeen: serverTimestamp()
            });
          } else {
            // User is back online
            await setDoc(userPresenceRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName,
              email: currentUser.email,
              photoURL: currentUser.photoURL,
              isOnline: true,
              lastSeen: serverTimestamp()
            });
          }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Cleanup function
        return () => {
          window.removeEventListener("beforeunload", handleBeforeUnload);
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          
          // Set user offline when component unmounts
          if (userPresenceRef) {
            deleteDoc(userPresenceRef).catch(console.error);
          }
        };

      } catch (error) {
        console.error("Error setting up presence:", error);
        setLoading(false);
      }
    };

    const cleanup = setupPresence();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, [currentUser]);

  return { onlineUsers, loading };
};