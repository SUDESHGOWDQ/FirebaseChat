import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc,
  updateDoc,
  doc,
  getDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

export const useGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentUser = auth.currentUser;

  // Subscribe to groups where user is a member
  useEffect(() => {
    if (!currentUser) return;

    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', currentUser.uid),
      orderBy('lastActivity', 'desc')
    );

    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsData);
      setLoading(false);
    }, (err) => {
      setError('Failed to load groups');
      console.error('Error loading groups:', err);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  const createGroup = useCallback(async (groupData) => {
    if (!currentUser) return;

    try {
      const newGroup = {
        ...groupData,
        members: [currentUser.uid],
        admins: [currentUser.uid],
        createdBy: currentUser.uid,
        createdAt: new Date(),
        lastActivity: new Date()
      };

      const docRef = await addDoc(collection(db, 'groups'), newGroup);
      return docRef.id;
    } catch (err) {
      setError('Failed to create group');
      console.error('Error creating group:', err);
      throw err;
    }
  }, [currentUser]);

  const updateGroup = useCallback(async (groupId, updates) => {
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        ...updates,
        updatedAt: new Date()
      });
    } catch (err) {
      setError('Failed to update group');
      console.error('Error updating group:', err);
      throw err;
    }
  }, []);

  const addGroupMember = useCallback(async (groupId, userId) => {
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayUnion(userId),
        updatedAt: new Date()
      });
    } catch (err) {
      setError('Failed to add member');
      console.error('Error adding member:', err);
      throw err;
    }
  }, []);

  const removeGroupMember = useCallback(async (groupId, userId) => {
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayRemove(userId),
        updatedAt: new Date()
      });
    } catch (err) {
      setError('Failed to remove member');
      console.error('Error removing member:', err);
      throw err;
    }
  }, []);

  const leaveGroup = useCallback(async (groupId) => {
    if (!currentUser) return;

    try {
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayRemove(currentUser.uid),
        admins: arrayRemove(currentUser.uid),
        updatedAt: new Date()
      });
    } catch (err) {
      setError('Failed to leave group');
      console.error('Error leaving group:', err);
      throw err;
    }
  }, [currentUser]);

  return {
    groups,
    loading,
    error,
    createGroup,
    updateGroup,
    addGroupMember,
    removeGroupMember,
    leaveGroup
  };
};

export const useGroupChat = (groupId) => {
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const currentUser = auth.currentUser;

  // Load group data
  useEffect(() => {
    if (!groupId) return;

    const loadGroup = async () => {
      try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          setGroup({ id: groupDoc.id, ...groupDoc.data() });
        } else {
          setError('Group not found');
        }
      } catch (err) {
        setError('Failed to load group');
        console.error('Error loading group:', err);
      }
    };

    loadGroup();
  }, [groupId]);

  // Subscribe to group messages
  useEffect(() => {
    if (!groupId) return;

    const messagesQuery = query(
      collection(db, 'groups', groupId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesData);
      setLoading(false);
    }, (err) => {
      setError('Failed to load messages');
      console.error('Error loading messages:', err);
      setLoading(false);
    });

    return unsubscribe;
  }, [groupId]);

  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || !groupId || sending || !currentUser) return;

    setSending(true);
    setError(null);

    try {
      await addDoc(collection(db, 'groups', groupId, 'messages'), {
        text: messageText,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderPhotoURL: currentUser.photoURL,
        createdAt: new Date(),
        type: 'text'
      });

      // Update group's last activity
      await updateDoc(doc(db, 'groups', groupId), {
        lastActivity: new Date()
      });
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
      throw err;
    } finally {
      setSending(false);
    }
  }, [groupId, currentUser, sending]);

  return {
    group,
    messages,
    onlineMembers,
    loading,
    sending,
    error,
    sendMessage,
    setGroup
  };
};