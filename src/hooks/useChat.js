import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';

export const useChat = (friendId) => {
  const [messages, setMessages] = useState([]);
  const [friend, setFriend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const currentUser = auth.currentUser;
  const chatId = friendId && currentUser ? [currentUser.uid, friendId].sort().join('_') : null;

  // Load friend data
  useEffect(() => {
    if (!friendId) return;

    const loadFriend = async () => {
      try {
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        if (friendDoc.exists()) {
          setFriend({ id: friendDoc.id, ...friendDoc.data() });
        } else {
          setError('Friend not found');
        }
      } catch (err) {
        setError('Failed to load friend data');
        console.error('Error loading friend:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFriend();
  }, [friendId]);

  // Subscribe to messages
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesData);
    }, (error) => {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
    });

    return unsubscribe;
  }, [chatId]);

  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || !chatId || sending) return;

    setSending(true);
    setError(null);

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: messageText,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderPhotoURL: currentUser.photoURL,
        createdAt: new Date(),
        type: 'text'
      });

      // Update user status to show they're active
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        isOnline: true,
        lastSeen: new Date()
      });
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
      throw err;
    } finally {
      setSending(false);
    }
  }, [chatId, currentUser, sending]);

  return {
    messages,
    friend,
    loading,
    sending,
    error,
    sendMessage
  };
};