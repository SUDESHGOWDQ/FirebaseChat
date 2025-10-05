import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';

export const useFriends = () => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentUser = auth.currentUser;

  // Subscribe to friends
  useEffect(() => {
    if (!currentUser) return;

    const friendsQuery = query(
      collection(db, 'friends'),
      where('users', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(friendsQuery, async (snapshot) => {
      try {
        const friendsData = [];
        for (const doc of snapshot.docs) {
          const data = doc.data();
          const friendId = data.users.find(uid => uid !== currentUser.uid);
          
          // Get friend's data
          const friendDoc = await getDocs(query(
            collection(db, 'users'),
            where('__name__', '==', friendId)
          ));
          
          if (!friendDoc.empty) {
            const friendData = friendDoc.docs[0].data();
            friendsData.push({
              id: friendId,
              ...friendData,
              friendshipId: doc.id
            });
          }
        }
        setFriends(friendsData);
      } catch (err) {
        setError('Failed to load friends');
        console.error('Error loading friends:', err);
      }
    });

    return unsubscribe;
  }, [currentUser]);

  // Subscribe to friend requests received
  useEffect(() => {
    if (!currentUser) return;

    const requestsQuery = query(
      collection(db, 'friendRequests'),
      where('to', '==', currentUser.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(requestsQuery, async (snapshot) => {
      try {
        const requestsData = [];
        for (const doc of snapshot.docs) {
          const data = doc.data();
          
          // Get sender's data
          const senderDoc = await getDocs(query(
            collection(db, 'users'),
            where('__name__', '==', data.from)
          ));
          
          if (!senderDoc.empty) {
            const senderData = senderDoc.docs[0].data();
            requestsData.push({
              id: doc.id,
              ...data,
              senderData
            });
          }
        }
        setFriendRequests(requestsData);
      } catch (err) {
        setError('Failed to load friend requests');
        console.error('Error loading friend requests:', err);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [currentUser]);

  // Subscribe to sent requests
  useEffect(() => {
    if (!currentUser) return;

    const sentQuery = query(
      collection(db, 'friendRequests'),
      where('from', '==', currentUser.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(sentQuery, (snapshot) => {
      const sentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSentRequests(sentData);
    });

    return unsubscribe;
  }, [currentUser]);

  const sendFriendRequest = useCallback(async (userId) => {
    if (!currentUser || userId === currentUser.uid) return;

    try {
      await addDoc(collection(db, 'friendRequests'), {
        from: currentUser.uid,
        to: userId,
        status: 'pending',
        createdAt: new Date()
      });
    } catch (err) {
      setError('Failed to send friend request');
      console.error('Error sending friend request:', err);
      throw err;
    }
  }, [currentUser]);

  const acceptFriendRequest = useCallback(async (requestId, fromUserId) => {
    if (!currentUser) return;

    try {
      // Update request status
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'accepted',
        acceptedAt: new Date()
      });

      // Create friendship
      await addDoc(collection(db, 'friends'), {
        users: [currentUser.uid, fromUserId],
        createdAt: new Date()
      });
    } catch (err) {
      setError('Failed to accept friend request');
      console.error('Error accepting friend request:', err);
      throw err;
    }
  }, [currentUser]);

  const declineFriendRequest = useCallback(async (requestId) => {
    try {
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'declined',
        declinedAt: new Date()
      });
    } catch (err) {
      setError('Failed to decline friend request');
      console.error('Error declining friend request:', err);
      throw err;
    }
  }, []);

  const removeFriend = useCallback(async (friendshipId) => {
    try {
      await deleteDoc(doc(db, 'friends', friendshipId));
    } catch (err) {
      setError('Failed to remove friend');
      console.error('Error removing friend:', err);
      throw err;
    }
  }, []);

  return {
    friends,
    friendRequests,
    sentRequests,
    loading,
    error,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend
  };
};