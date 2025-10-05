import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { FaUserPlus, FaCheck, FaUser } from 'react-icons/fa';
import './UserList.scss';

const UserList = ({ users }) => {
  const [sendingRequests, setSendingRequests] = useState({});
  const [sentRequests, setSentRequests] = useState({});
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const sendFriendRequest = async (receiverId) => {
    if (!currentUser) return;

    setSendingRequests(prev => ({ ...prev, [receiverId]: true }));

    try {
      // Check if friend request already exists
      const existingRequestQuery = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', currentUser.uid),
        where('receiverId', '==', receiverId)
      );
      
      const existingSnapshot = await getDocs(existingRequestQuery);
      
      if (!existingSnapshot.empty) {
        alert('Friend request already sent!');
        setSendingRequests(prev => ({ ...prev, [receiverId]: false }));
        return;
      }

      // Check if they are already friends
      const friendshipQuery = query(
        collection(db, 'friendships'),
        where('users', 'array-contains', currentUser.uid)
      );
      
      const friendshipSnapshot = await getDocs(friendshipQuery);
      const existingFriendship = friendshipSnapshot.docs.find(doc => 
        doc.data().users.includes(receiverId)
      );

      if (existingFriendship) {
        alert('You are already friends!');
        setSendingRequests(prev => ({ ...prev, [receiverId]: false }));
        return;
      }

      // Send friend request
      await addDoc(collection(db, 'friendRequests'), {
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderEmail: currentUser.email,
        senderPhotoURL: currentUser.photoURL,
        receiverId,
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

  if (users.length === 0) {
    return (
      <div className="user-list-empty">
        <p>Search for users by email to send friend requests</p>
      </div>
    );
  }

  return (
    <div className="user-list">
      {users.map(user => (
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
              {user.isOnline && <div className="online-indicator"></div>}
            </div>
            
            <div className="user-details">
              <h4>{user.displayName || 'Unknown User'}</h4>
              <p>{user.email}</p>
              {user.lastSeen && (
                <span className="last-seen">
                  {user.isOnline ? 'Online' : `Last seen ${new Date(user.lastSeen.toDate()).toLocaleDateString()}`}
                </span>
              )}
            </div>
          </div>
          
          <div className="user-actions">
            {sentRequests[user.id] ? (
              <button className="btn btn-success sent-btn" disabled>
                <FaCheck />
                Request Sent
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => sendFriendRequest(user.id)}
                disabled={sendingRequests[user.id]}
              >
                <FaUserPlus />
                {sendingRequests[user.id] ? 'Sending...' : 'Add Friend'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserList;