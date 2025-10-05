import React, { useState } from 'react';
import { auth, db } from '../../../firebase';
import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { FaCheck, FaTimes, FaClock } from 'react-icons/fa';
import './FriendRequests.scss';

const FriendRequests = ({ requests }) => {
  const [processing, setProcessing] = useState({});
  const currentUser = auth.currentUser;

  const handleRequest = async (requestId, senderId, senderData, action) => {
    if (!currentUser) return;

    setProcessing(prev => ({ ...prev, [requestId]: true }));

    try {
      if (action === 'accept') {
        // Create friendship
        await addDoc(collection(db, 'friendships'), {
          users: [currentUser.uid, senderId],
          createdAt: new Date(),
          user1: {
            id: currentUser.uid,
            name: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL
          },
          user2: {
            id: senderId,
            name: senderData.senderName,
            email: senderData.senderEmail,
            photoURL: senderData.senderPhotoURL
          }
        });

        // Update request status
        const requestRef = doc(db, 'friendRequests', requestId);
        await updateDoc(requestRef, {
          status: 'accepted',
          updatedAt: new Date()
        });
      } else {
        // Reject request - just delete it
        const requestRef = doc(db, 'friendRequests', requestId);
        await deleteDoc(requestRef);
      }
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error);
      alert(`Failed to ${action} friend request. Please try again.`);
    } finally {
      setProcessing(prev => ({ ...prev, [requestId]: false }));
    }
  };

  if (requests.length === 0) {
    return (
      <div className="friend-requests-empty">
        <FaClock className="empty-icon" />
        <h3>No pending friend requests</h3>
        <p>When someone sends you a friend request, it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="friend-requests">
      {requests.map(request => (
        <div key={request.id} className="request-card">
          <div className="request-info">
            <img
              src={request.senderPhotoURL || '/default-avatar.png'}
              alt={request.senderName}
              className="sender-avatar"
            />
            
            <div className="request-details">
              <h4>{request.senderName || 'Unknown User'}</h4>
              <p>{request.senderEmail}</p>
              <span className="request-time">
                {new Date(request.createdAt.toDate()).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="request-actions">
            <button
              className="btn btn-success accept-btn"
              onClick={() => handleRequest(request.id, request.senderId, request, 'accept')}
              disabled={processing[request.id]}
            >
              <FaCheck />
              Accept
            </button>
            
            <button
              className="btn btn-secondary reject-btn"
              onClick={() => handleRequest(request.id, request.senderId, request, 'reject')}
              disabled={processing[request.id]}
            >
              <FaTimes />
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FriendRequests;