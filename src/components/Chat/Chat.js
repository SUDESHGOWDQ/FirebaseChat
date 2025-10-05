import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  getDoc,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { FaArrowLeft, FaPaperPlane, FaCircle, FaVideo, FaUser, FaPhone } from 'react-icons/fa';
import VideoCall from '../VideoCall/VideoCall';
import VoiceCall from '../VoiceCall/VoiceCall';
import IncomingCall from '../VideoCall/IncomingCall';
import './Chat.scss';

const Chat = () => {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const [friend, setFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [inVoiceCall, setInVoiceCall] = useState(false);
  const [callType, setCallType] = useState('video'); // 'video' or 'voice'
  const [incomingCall, setIncomingCall] = useState(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  };

  useEffect(() => {
    // Only auto-scroll if user is near the bottom to avoid interrupting manual scrolling
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (messagesContainer) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [messages]);

  // Keep user online while in chat
  useEffect(() => {
    if (!currentUser) return;

    // Set user online when entering chat
    updateUserStatus(true);

    // Set up interval to periodically update online status
    const statusInterval = setInterval(() => {
      updateUserStatus(true);
    }, 30000); // Update every 30 seconds

    // Update status on user activity (typing, clicking, etc.)
    const handleUserActivity = () => {
      updateUserStatus(true);
    };

    // Add event listeners for user activity
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('mousemove', handleUserActivity);

    // Cleanup function
    return () => {
      clearInterval(statusInterval);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('mousemove', handleUserActivity);
      // Note: We don't set user offline here because they might navigate to another page
    };
  }, [currentUser, updateUserStatus]);

  useEffect(() => {
    if (!currentUser || !friendId) return;

    // Verify friendship exists
    const verifyFriendship = async () => {
      try {
        const friendshipQuery = query(
          collection(db, 'friendships'),
          where('users', 'array-contains', currentUser.uid)
        );
        
        const friendshipSnapshot = await getDocs(friendshipQuery);
        const isFriend = friendshipSnapshot.docs.some(doc => 
          doc.data().users.includes(friendId)
        );

        if (!isFriend) {
          alert('You can only chat with friends!');
          navigate('/dashboard');
          return;
        }

        // Get friend details
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        if (friendDoc.exists()) {
          setFriend({ id: friendDoc.id, ...friendDoc.data() });
        }

        // Set up messages listener
        const chatId = [currentUser.uid, friendId].sort().join('_');
        const messagesQuery = query(
          collection(db, 'chats', chatId, 'messages'),
          orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
          const messagesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMessages(messagesData);
        });

        // Listen for incoming calls
        const callsQuery = query(
          collection(db, 'calls'),
          where('callee', '==', currentUser.uid),
          where('status', '==', 'ringing')
        );

        const callsUnsubscribe = onSnapshot(callsQuery, async (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const callData = change.doc.data();
              if (callData.caller === friendId) {
                // Get friend data for the call
                const friendDoc = await getDoc(doc(db, 'users', friendId));
                const friendData = friendDoc.exists() ? { id: friendDoc.id, ...friendDoc.data() } : null;
                
                setIncomingCall({
                  id: change.doc.id,
                  caller: friendData,
                  ...callData
                });
                setShowIncomingCall(true);
              }
            }
          });
        });

        setLoading(false);
        return () => {
          unsubscribe();
          callsUnsubscribe();
        };
      } catch (error) {
        console.error('Error setting up chat:', error);
        setLoading(false);
      }
    };

    verifyFriendship();
  }, [currentUser, friendId, navigate]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      // Update user status to show they're active
      updateUserStatus(true);

      const chatId = [currentUser.uid, friendId].sort().join('_');
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: messageText,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderPhotoURL: currentUser.photoURL,
        createdAt: new Date(),
        type: 'text'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const initiateVideoCall = async () => {
    try {
      setCallType('video');
      setInCall(true);
    } catch (error) {
      console.error('Error initiating video call:', error);
      alert('Failed to initiate video call. Please try again.');
      setInCall(false);
    }
  };

  const initiateVoiceCall = async () => {
    try {
      setCallType('voice');
      setInVoiceCall(true);
    } catch (error) {
      console.error('Error initiating voice call:', error);
      alert('Failed to initiate voice call. Please try again.');
      setInVoiceCall(false);
    }
  };

  const endVideoCall = () => {
    setInCall(false);
    setInVoiceCall(false);
    setIncomingCall(null);
    setShowIncomingCall(false);
  };

  const acceptIncomingCall = () => {
    setShowIncomingCall(false);
    const callTypeFromIncoming = incomingCall?.type || 'video';
    setCallType(callTypeFromIncoming);
    
    if (callTypeFromIncoming === 'voice') {
      setInVoiceCall(true);
    } else {
      setInCall(true);
    }
  };

  const declineIncomingCall = async () => {
    if (incomingCall?.id) {
      try {
        await updateDoc(doc(db, 'calls', incomingCall.id), {
          status: 'declined',
          declinedAt: new Date()
        });
      } catch (error) {
        console.error('Error declining call:', error);
      }
    }
    setShowIncomingCall(false);
    setIncomingCall(null);
  };

  if (loading) {
    return (
      <div className="chat-loading">
        <div className="loading-spinner"></div>
        <p>Loading chat...</p>
      </div>
    );
  }

  if (!friend) {
    return (
      <div className="chat-error">
        <h3>Friend not found</h3>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Incoming Call Notification */}
      {showIncomingCall && incomingCall && (
        <IncomingCall
          caller={incomingCall.caller}
          onAccept={acceptIncomingCall}
          onDecline={declineIncomingCall}
          callType={incomingCall.type || 'video'}
        />
      )}

      {/* Video Call Interface */}
      {inCall && callType === 'video' && (
        <VideoCall
          friendId={friendId}
          friendName={friend?.displayName || 'Unknown User'}
          onEndCall={endVideoCall}
          callId={incomingCall?.id || null}
          callerInfo={friend}
        />
      )}

      {/* Voice Call Interface */}
      {inVoiceCall && callType === 'voice' && (
        <VoiceCall
          friendId={friendId}
          friendName={friend?.displayName || 'Unknown User'}
          onEndCall={endVideoCall}
          callId={incomingCall?.id || null}
          callerInfo={friend}
        />
      )}
      
      <div className="chat-header">
        <div className="header-left">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            <FaArrowLeft />
          </button>
          
          <div className="friend-info">
            <div className="friend-avatar-container">
              {friend.photoURL ? (
                <img
                  src={friend.photoURL}
                  alt={friend.displayName}
                  className="friend-avatar clickable-avatar"
                  onClick={() => navigate(`/user-profile/${friendId}`)}
                  title={`View ${friend.displayName}'s profile`}
                />
              ) : (
                <div 
                  className="friend-avatar-icon clickable-avatar"
                  onClick={() => navigate(`/user-profile/${friendId}`)}
                  title={`View ${friend.displayName}'s profile`}
                >
                  <FaUser />
                </div>
              )}
              <div className={`status-indicator ${friend.isOnline ? 'online' : 'offline'}`}>
                <FaCircle />
              </div>
            </div>
            
            <div className="friend-details">
              <h3>{friend.displayName || 'Unknown User'}</h3>
              <span className={`status-text ${friend.isOnline ? 'online' : 'offline'}`}>
                {friend.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <button 
            onClick={initiateVoiceCall} 
            className="voice-call-btn"
            disabled={!friend.isOnline || inCall || inVoiceCall}
            title="Start voice call"
          >
            <FaPhone />
          </button>
          <button 
            onClick={initiateVideoCall} 
            className="video-call-btn"
            disabled={!friend.isOnline || inCall || inVoiceCall}
            title="Start video call"
          >
            <FaVideo />
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.senderId === currentUser.uid ? 'own' : 'other'}`}
            >
              <div className="message-bubble">
                <p>{message.text}</p>
                <span className="message-time">
                  {new Date(message.createdAt.toDate()).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input">
        <div className="input-container">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
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

export default Chat;