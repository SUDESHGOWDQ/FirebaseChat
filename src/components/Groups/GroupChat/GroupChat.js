import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../../../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  getDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { FaArrowLeft, FaPaperPlane, FaUsers, FaVideo, FaCog, FaCircle, FaUser } from 'react-icons/fa';
import GroupVideoCall from '../GroupVideoCall/GroupVideoCall';
import GroupInfo from '../GroupInfo/GroupInfo';
import './GroupChat.scss';

const GroupChat = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const messagesEndRef = useRef(null);
  const currentUser = auth.currentUser;

  // Update user online status
  const updateUserStatus = useCallback(async (isOnline) => {
    if (currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          isOnline,
          lastSeen: new Date()
        });
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    }
  }, [currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keep user online while in group chat
  useEffect(() => {
    if (!currentUser) return;

    updateUserStatus(true);

    const statusInterval = setInterval(() => {
      updateUserStatus(true);
    }, 30000);

    const handleUserActivity = () => {
      updateUserStatus(true);
    };

    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('mousemove', handleUserActivity);

    return () => {
      clearInterval(statusInterval);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('mousemove', handleUserActivity);
    };
  }, [currentUser, updateUserStatus]);

  useEffect(() => {
    if (!currentUser || !groupId) return;

    const setupGroupChat = async () => {
      try {
        // Get group details
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (!groupDoc.exists()) {
          alert('Group not found!');
          navigate('/dashboard');
          return;
        }

        const groupData = { id: groupDoc.id, ...groupDoc.data() };
        
        // Check if user is a member
        if (!groupData.members.includes(currentUser.uid)) {
          alert('You are not a member of this group!');
          navigate('/dashboard');
          return;
        }

        setGroup(groupData);

        // Set up messages listener
        const messagesQuery = query(
          collection(db, 'groups', groupId, 'messages'),
          orderBy('createdAt', 'asc')
        );

        const messagesUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
          const messagesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMessages(messagesData);
        });

        // Listen for online members
        const onlineMembersQuery = query(
          collection(db, 'users'),
          where('__name__', 'in', groupData.members),
          where('isOnline', '==', true)
        );

        const onlineMembersUnsubscribe = onSnapshot(onlineMembersQuery, (snapshot) => {
          const onlineMembersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setOnlineMembers(onlineMembersData);
        });

        setLoading(false);

        return () => {
          messagesUnsubscribe();
          onlineMembersUnsubscribe();
        };
      } catch (error) {
        console.error('Error setting up group chat:', error);
        setLoading(false);
      }
    };

    setupGroupChat();
  }, [currentUser, groupId, navigate]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      updateUserStatus(true);

      await addDoc(collection(db, 'groups', groupId, 'messages'), {
        text: messageText,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Unknown',
        senderPhotoURL: currentUser.photoURL || '',
        createdAt: new Date(),
        type: 'text'
      });

      // Update group's last activity
      await updateDoc(doc(db, 'groups', groupId), {
        lastActivity: new Date()
      });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const initiateGroupVideoCall = () => {
    setInCall(true);
  };

  const handleEndCall = () => {
    setInCall(false);
  };

  const handleShowGroupInfo = () => {
    setShowGroupInfo(true);
  };

  const handleCloseGroupInfo = () => {
    setShowGroupInfo(false);
  };

  const handleGroupDeleted = () => {
    navigate('/dashboard');
  };

  const handleGroupUpdated = (updatedGroup) => {
    setGroup(updatedGroup);
  };

  if (loading) {
    return (
      <div className="group-chat loading">
        <div className="loading-spinner"></div>
        <p>Loading group chat...</p>
      </div>
    );
  }

  if (inCall) {
    return (
      <GroupVideoCall
        group={group}
        onEndCall={handleEndCall}
      />
    );
  }

  return (
    <div className="group-chat">
      {/* Group Info Modal */}
      {showGroupInfo && (
        <GroupInfo
          group={group}
          onClose={handleCloseGroupInfo}
          onGroupDeleted={handleGroupDeleted}
          onGroupUpdated={handleGroupUpdated}
        />
      )}

      <div className="group-chat-header">
        <div className="header-left">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            <FaArrowLeft />
          </button>
          
          <div className="group-info">
            <div className="group-avatar-container">
              <img
                src={group.photoURL || '/default-group.png'}
                alt={group.name}
                className="group-avatar clickable-avatar"
                onClick={handleShowGroupInfo}
                title={`View ${group.name} info`}
              />
              <div className="member-count">
                <FaUsers />
                <span>{group.members?.length || 0}</span>
              </div>
            </div>
            
            <div className="group-details">
              <h3>{group.name}</h3>
              <div className="group-status">
                <span className="online-count">
                  <FaCircle className="online-indicator" />
                  {onlineMembers.length} online
                </span>
                <span className="member-count-text">
                  {group.members?.length || 0} members
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <button 
            onClick={initiateGroupVideoCall} 
            className="video-call-btn"
            title="Start group video call"
          >
            <FaVideo />
          </button>
          <button 
            onClick={handleShowGroupInfo}
            className="group-info-btn"
            title="Group info"
          >
            <FaCog />
          </button>
        </div>
      </div>

      <div className="group-chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.senderId === currentUser.uid;
            const showAvatar = !isOwn && (index === 0 || messages[index - 1].senderId !== message.senderId);
            
            return (
              <div
                key={message.id}
                className={`message ${isOwn ? 'own' : 'other'}`}
              >
                {showAvatar && (
                  <div className="message-avatar">
                    {message.senderPhotoURL ? (
                      <img 
                        src={message.senderPhotoURL} 
                        alt={message.senderName}
                      />
                    ) : (
                      <div className="message-avatar-icon">
                        <FaUser />
                      </div>
                    )}
                  </div>
                )}
                <div className={`message-bubble ${!showAvatar && !isOwn ? 'no-avatar' : ''}`}>
                  {!isOwn && showAvatar && (
                    <div className="sender-name">{message.senderName}</div>
                  )}
                  <p>{message.text}</p>
                  <span className="message-time">
                    {new Date(message.createdAt.toDate()).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="group-chat-input">
        <div className="input-container">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${group.name}...`}
            disabled={sending}
          />
          <button type="submit" disabled={!newMessage.trim() || sending} className="send-btn">
            <FaPaperPlane />
          </button>
        </div>
      </form>
    </div>
  );
};

export default GroupChat;