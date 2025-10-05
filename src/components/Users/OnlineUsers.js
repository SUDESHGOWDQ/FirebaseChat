import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { collection, query, where, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { FaUserPlus, FaCheck, FaCircle, FaUsers, FaSync, FaComments, FaUser } from 'react-icons/fa';
import './OnlineUsers.scss';

const OnlineUsers = ({ onChatClick }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [sendingRequests, setSendingRequests] = useState({});
  const [sentRequests, setSentRequests] = useState({});
  const [existingFriends, setExistingFriends] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    // Get existing friends
    const getFriends = async () => {
      try {
        const friendshipQuery = query(
          collection(db, 'friendships'),
          where('users', 'array-contains', currentUser.uid)
        );
        
        const friendshipSnapshot = await getDocs(friendshipQuery);
        const friendIds = new Set();
        
        friendshipSnapshot.docs.forEach(doc => {
          const friendship = doc.data();
          const friendId = friendship.users.find(uid => uid !== currentUser.uid);
          if (friendId) friendIds.add(friendId);
        });
        
        setExistingFriends(friendIds);
      } catch (error) {
        console.error('Error fetching friends:', error);
      }
    };

    // Get sent requests
    const getSentRequests = async () => {
      try {
        const sentRequestsQuery = query(
          collection(db, 'friendRequests'),
          where('senderId', '==', currentUser.uid),
          where('status', '==', 'pending')
        );
        
        const sentSnapshot = await getDocs(sentRequestsQuery);
        const sentIds = {};
        
        sentSnapshot.docs.forEach(doc => {
          const request = doc.data();
          sentIds[request.receiverId] = true;
        });
        
        setSentRequests(sentIds);
      } catch (error) {
        console.error('Error fetching sent requests:', error);
      }
    };

    // Listen for online users
    const usersQuery = query(
      collection(db, 'users'),
      where('isOnline', '==', true)
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const users = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.id !== currentUser.uid);
      
      console.log('Online users fetched:', users.length, users); // Debug log
      setOnlineUsers(users);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching online users:', error);
      setLoading(false);
    });

    getFriends();
    getSentRequests();

    return () => unsubscribe();
  }, [currentUser]);

  const sendFriendRequest = async (receiverId, receiverName, receiverEmail, receiverPhoto) => {
    if (!currentUser) return;

    setSendingRequests(prev => ({ ...prev, [receiverId]: true }));

    try {
      // Check if friend request already exists
      const existingRequestQuery = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', currentUser.uid),
        where('receiverId', '==', receiverId),
        where('status', '==', 'pending')
      );
      
      const existingSnapshot = await getDocs(existingRequestQuery);
      
      if (!existingSnapshot.empty) {
        alert('Friend request already sent!');
        return;
      }

      // Send friend request
      await addDoc(collection(db, 'friendRequests'), {
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderEmail: currentUser.email,
        senderPhotoURL: currentUser.photoURL,
        receiverId,
        receiverName,
        receiverEmail,
        receiverPhotoURL: receiverPhoto,
        status: 'pending',
        createdAt: new Date()
      });

      setSentRequests(prev => ({ ...prev, [receiverId]: true }));
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request. Please try again.');
    } finally {
      setSendingRequests(prev => ({ ...prev, [receiverId]: false }));
    }
  };

  const getActionButton = (user) => {
    if (existingFriends.has(user.id)) {
      return (
        <div className="friend-actions">
          <button 
            className="btn btn-primary chat-btn"
            onClick={() => onChatClick && onChatClick(user.id)}
          >
            <FaComments />
            Chat
          </button>
          <button className="btn btn-success friend-status-btn" disabled>
            <FaCheck />
            Friends
          </button>
        </div>
      );
    }

    if (sentRequests[user.id]) {
      return (
        <button className="btn btn-info sent-btn" disabled>
          <FaCheck />
          Request Sent
        </button>
      );
    }

    return (
      <button
        className="btn btn-primary"
        onClick={() => sendFriendRequest(user.id, user.displayName, user.email, user.photoURL)}
        disabled={sendingRequests[user.id]}
      >
        <FaUserPlus />
        {sendingRequests[user.id] ? 'Sending...' : 'Add Friend'}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="online-users-loading">
        <div className="loading-spinner"></div>
        <p>Loading online users...</p>
      </div>
    );
  }

  return (
    <div className="online-users">
      <div className="online-users-header">
        <div className="header-info">
          <FaUsers className="header-icon" />
          <h2>Online Users</h2>
          <span className="users-count">({onlineUsers.length} online)</span>
          <button 
            className="refresh-btn"
            onClick={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 1000);
            }}
            disabled={refreshing}
          >
            <FaSync className={refreshing ? 'spinning' : ''} />
          </button>
        </div>
        <p className="header-description">
          Users currently online - send friend requests to start chatting!
        </p>
      </div>

      {onlineUsers.length === 0 ? (
        <div className="no-users">
          <FaUsers className="empty-icon" />
          <h3>No other users online</h3>
          <p>Be the first to connect when others come online!</p>
        </div>
      ) : (
        <div className="users-grid">
          {onlineUsers.map(user => (
            <div key={user.id} className="user-card">
              <div className="user-info">
                <div className="user-avatar-container">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="user-avatar clickable-avatar"
                      onClick={() => navigate(`/user-profile/${user.id}`)}
                      title={`View ${user.displayName}'s profile`}
                    />
                  ) : (
                    <div 
                      className="user-avatar-icon clickable-avatar"
                      onClick={() => navigate(`/user-profile/${user.id}`)}
                      title={`View ${user.displayName}'s profile`}
                    >
                      <FaUser />
                    </div>
                  )}
                  <div className="online-indicator">
                    <FaCircle />
                  </div>
                </div>
                
                <div className="user-details">
                  <h4>{user.displayName || 'Unknown User'}</h4>
                  <p className="user-email">{user.email}</p>
                  <span className="status-text online">
                    <FaCircle />
                    Online now
                  </span>
                </div>
              </div>
              
              <div className="user-actions">
                {getActionButton(user)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OnlineUsers;