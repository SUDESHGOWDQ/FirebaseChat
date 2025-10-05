import React, { useState, useEffect } from 'react';
import { auth, db } from '../../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { FaComments, FaCircle, FaUser } from 'react-icons/fa';
import './FriendsList.scss';

const FriendsList = ({ friends, onChatClick }) => {
  const [friendsWithDetails, setFriendsWithDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser || friends.length === 0) {
      setFriendsWithDetails([]);
      setLoading(false);
      return;
    }

    // Get friend IDs
    const friendIds = friends.map(friendship => {
      return friendship.users.find(userId => userId !== currentUser.uid);
    });

    if (friendIds.length === 0) {
      setFriendsWithDetails([]);
      setLoading(false);
      return;
    }

    // Listen for friend details
    const usersQuery = query(
      collection(db, 'users'),
      where('__name__', 'in', friendIds)
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const friendsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFriendsWithDetails(friendsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [friends, currentUser]);

  if (loading) {
    return (
      <div className="friends-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading friends...</p>
      </div>
    );
  }

  if (friendsWithDetails.length === 0) {
    return (
      <div className="friends-list-empty">
        <FaComments className="empty-icon" />
        <h3>No friends yet</h3>
        <p>Start by searching for users and sending friend requests!</p>
      </div>
    );
  }

  return (
    <div className="friends-list">
      {friendsWithDetails.map(friend => (
        <div key={friend.id} className="friend-card" onClick={() => onChatClick(friend.id)}>
          <div className="friend-info">
            <div className="friend-avatar-container">
              {friend.photoURL ? (
                <img
                  src={friend.photoURL}
                  alt={friend.displayName}
                  className="friend-avatar"
                />
              ) : (
                <div className="friend-avatar-icon">
                  <FaUser />
                </div>
              )}
              <div className={`status-indicator ${friend.isOnline ? 'online' : 'offline'}`}>
                <FaCircle />
              </div>
            </div>
            
            <div className="friend-details">
              <h4>{friend.displayName || 'Unknown User'}</h4>
              <p className="friend-email">{friend.email}</p>
              <span className={`status-text ${friend.isOnline ? 'online' : 'offline'}`}>
                {friend.isOnline ? 'Online' : `Last seen ${friend.lastSeen ? new Date(friend.lastSeen.toDate()).toLocaleDateString() : 'Unknown'}`}
              </span>
            </div>
          </div>
          
          <div className="friend-actions">
            <button className="chat-btn">
              <FaComments />
              <span>Chat</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FriendsList;