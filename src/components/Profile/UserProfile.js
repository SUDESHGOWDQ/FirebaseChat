import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { FaArrowLeft, FaUserPlus, FaUserCheck, FaEnvelope, FaVideo, FaCircle, FaUser } from 'react-icons/fa';
import './UserProfile.scss';

const UserProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const currentUser = auth.currentUser;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId || userId === currentUser?.uid) {
        navigate('/profile');
        return;
      }

      try {
        // Get user details
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
          setError('User not found');
          setLoading(false);
          return;
        }

        setUser({ id: userDoc.id, ...userDoc.data() });

        // Check if they are friends
        const friendshipQuery = query(
          collection(db, 'friendships'),
          where('users', 'array-contains', currentUser.uid)
        );
        
        const friendshipSnapshot = await getDocs(friendshipQuery);
        const friendship = friendshipSnapshot.docs.find(doc => 
          doc.data().users.includes(userId)
        );
        
        setIsFriend(!!friendship);

        // Check if friend request was sent
        if (!friendship) {
          const requestQuery = query(
            collection(db, 'friendRequests'),
            where('from', '==', currentUser.uid),
            where('to', '==', userId),
            where('status', '==', 'pending')
          );
          
          const requestSnapshot = await getDocs(requestQuery);
          setFriendRequestSent(!requestSnapshot.empty);
        }

      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, currentUser, navigate]);

  const startChat = () => {
    if (isFriend) {
      navigate(`/chat/${userId}`);
    }
  };

  const startVideoCall = () => {
    if (isFriend && user?.isOnline) {
      navigate(`/chat/${userId}`, { state: { startCall: true } });
    }
  };

  if (loading) {
    return (
      <div className="user-profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="user-profile-error">
        <h3>{error || 'User not found'}</h3>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      <div className="user-profile-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <FaArrowLeft />
          Back
        </button>
        
        <h1>User Profile</h1>
      </div>

      <div className="user-profile-content">
        <div className="user-profile-card">
          <div className="user-avatar-section">
            <div className="avatar-container">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="user-avatar"
                />
              ) : (
                <div className="user-avatar-icon">
                  <FaUser />
                </div>
              )}
              <div className={`status-indicator ${user.isOnline ? 'online' : 'offline'}`}>
                <FaCircle />
              </div>
            </div>

            <h2>{user.displayName || 'User'}</h2>
            <p className="user-email">{user.email}</p>
            <p className="user-status">
              {user.isOnline ? (
                <span className="status-online">
                  <FaCircle /> Online
                </span>
              ) : (
                <span className="status-offline">
                  <FaCircle /> Offline
                </span>
              )}
            </p>
          </div>

          <div className="user-actions">
            {isFriend ? (
              <div className="friend-actions">
                <div className="friend-badge">
                  <FaUserCheck />
                  <span>Friend</span>
                </div>
                
                <div className="action-buttons">
                  <button
                    onClick={startChat}
                    className="btn btn-primary"
                  >
                    <FaEnvelope />
                    Send Message
                  </button>
                  
                  <button
                    onClick={startVideoCall}
                    className="btn btn-secondary"
                    disabled={!user.isOnline}
                    title={user.isOnline ? 'Start video call' : 'User is offline'}
                  >
                    <FaVideo />
                    Video Call
                  </button>
                </div>
              </div>
            ) : (
              <div className="non-friend-actions">
                {friendRequestSent ? (
                  <div className="request-sent">
                    <FaUserPlus />
                    <span>Friend request sent</span>
                  </div>
                ) : (
                  <div className="not-friends-message">
                    <p>You need to be friends to chat with this user.</p>
                    <p>Send a friend request from the dashboard to connect!</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="user-info-section">
            <h3>Profile Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Display Name</label>
                <span>{user.displayName || 'Not set'}</span>
              </div>
              
              <div className="info-item">
                <label>Email</label>
                <span>{user.email}</span>
              </div>
              
              <div className="info-item">
                <label>Status</label>
                <span className={user.isOnline ? 'online' : 'offline'}>
                  {user.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              {user.lastSeen && (
                <div className="info-item">
                  <label>Last Seen</label>
                  <span>{new Date(user.lastSeen.toDate()).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;