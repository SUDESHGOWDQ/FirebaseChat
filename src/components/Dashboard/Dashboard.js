import React, { useState, useEffect, useCallback } from 'react';
import { auth, db } from '../../firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import UserList from '../Users/UserList';
import OnlineUsers from '../Users/OnlineUsers';
import FriendRequests from '../Friends/FriendRequests/FriendRequests';
import FriendsList from '../Friends/FriendsList/FriendsList';
import GroupList from '../Groups/GroupList/GroupList';
import { FaSignOutAlt, FaSearch, FaUserFriends, FaBell, FaCircle, FaUsers, FaUser } from 'react-icons/fa';
import './Dashboard.scss';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('online');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const updateUserStatus = useCallback(async (isOnline) => {
    if (currentUser) {
      try {
        console.log(`Updating user status to: ${isOnline ? 'online' : 'offline'} for user:`, currentUser.uid); // Debug log
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          isOnline,
          lastSeen: new Date()
        });
        console.log('User status updated successfully'); // Debug log
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    }
  }, [currentUser]);

  const searchUsers = useCallback(async () => {
    if (!searchTerm.trim()) {
      setUsers([]);
      return;
    }

    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '>=', searchTerm.toLowerCase()),
        where('email', '<=', searchTerm.toLowerCase() + '\uf8ff')
      );
      
      const snapshot = await getDocs(usersQuery);
      const usersList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.id !== currentUser.uid);
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  }, [searchTerm, currentUser]);

  useEffect(() => {
    if (currentUser) {
      // Update user status to online
      updateUserStatus(true);
      
      // Listen for friend requests
      const friendRequestsQuery = query(
        collection(db, 'friendRequests'),
        where('receiverId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      
      const unsubscribeFriendRequests = onSnapshot(friendRequestsQuery, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFriendRequests(requests);
      });

      // Listen for friends list
      const friendsQuery = query(
        collection(db, 'friendships'),
        where('users', 'array-contains', currentUser.uid)
      );
      
      const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
        const friendships = snapshot.docs.map(doc => doc.data());
        setFriends(friendships);
      });

      setLoading(false);

      return () => {
        unsubscribeFriendRequests();
        unsubscribeFriends();
        updateUserStatus(false);
      };
    }
  }, [currentUser, updateUserStatus]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchUsers]);

  const handleLogout = async () => {
    try {
      await updateUserStatus(false);
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleChatClick = (friendId) => {
    navigate(`/chat/${friendId}`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="user-info">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Profile"
                className="avatar clickable-avatar"
                onClick={() => navigate('/profile')}
                title="Go to Profile"
              />
            ) : (
              <div 
                className="avatar-icon clickable-avatar"
                onClick={() => navigate('/profile')}
                title="Go to Profile"
              >
                <FaUser />
              </div>
            )}
            <div className="user-details">
              <h3>{currentUser?.displayName || 'User'}</h3>
              <p>{currentUser?.email}</p>
            </div>
          </div>
          
          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt />
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="sidebar">
          <div className="search-section">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search users by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="navigation-tabs">
            <button
              className={`nav-tab ${activeTab === 'online' ? 'active' : ''}`}
              onClick={() => setActiveTab('online')}
            >
              <FaCircle />
              <span>Online Users</span>
            </button>
            
            <button
              className={`nav-tab ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <FaSearch />
              <span>Search Users</span>
            </button>
            
            <button
              className={`nav-tab ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              <FaBell />
              <span>Requests</span>
              {friendRequests.length > 0 && (
                <span className="notification-badge">{friendRequests.length}</span>
              )}
            </button>
            
            <button
              className={`nav-tab ${activeTab === 'friends' ? 'active' : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              <FaUserFriends />
              <span>Friends</span>
            </button>
            
            <button
              className={`nav-tab ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveTab('groups')}
            >
              <FaUsers />
              <span>Groups</span>
            </button>
          </div>
        </div>

        <div className="main-content">
          {activeTab === 'online' && (
            <div className="content-section">
              <OnlineUsers onChatClick={handleChatClick} />
            </div>
          )}
          
          {activeTab === 'search' && (
            <div className="content-section">
              <h2>Search Users</h2>
              <UserList users={users} />
            </div>
          )}
          
          {activeTab === 'requests' && (
            <div className="content-section">
              <h2>Friend Requests</h2>
              <FriendRequests requests={friendRequests} />
            </div>
          )}
          
          {activeTab === 'friends' && (
            <div className="content-section">
              <h2>Your Friends</h2>
              <FriendsList friends={friends} onChatClick={handleChatClick} />
            </div>
          )}
          
          {activeTab === 'groups' && (
            <div className="content-section">
              <GroupList />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;