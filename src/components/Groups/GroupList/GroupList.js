import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { FaUsers, FaCircle, FaVideo, FaPlus, FaCrown } from 'react-icons/fa';
import './GroupList.scss';

const GroupList = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    // Listen for groups where current user is a member
    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(groupsQuery, async (snapshot) => {
      const groupsData = await Promise.all(
        snapshot.docs.map(async (groupDoc) => {
          const groupData = { id: groupDoc.id, ...groupDoc.data() };
          
          // Get last message if exists
          try {
            const lastMessageQuery = query(
              collection(db, 'groups', groupDoc.id, 'messages'),
              orderBy('createdAt', 'desc'),
              limit(1)
            );
            const lastMessageSnapshot = await getDocs(lastMessageQuery);
            
            if (!lastMessageSnapshot.empty) {
              groupData.lastMessage = lastMessageSnapshot.docs[0].data();
            }
          } catch (error) {
            console.error('Error fetching last message:', error);
          }

          // Count online members
          const onlineMembersQuery = query(
            collection(db, 'users'),
            where('__name__', 'in', groupData.members),
            where('isOnline', '==', true)
          );
          
          try {
            const onlineMembersSnapshot = await getDocs(onlineMembersQuery);
            groupData.onlineCount = onlineMembersSnapshot.size;
          } catch (error) {
            groupData.onlineCount = 0;
          }

          return groupData;
        })
      );

      setGroups(groupsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleGroupClick = (groupId) => {
    navigate(`/group/${groupId}`);
  };

  const handleVideoCall = (e, groupId) => {
    e.stopPropagation();
    navigate(`/group-video/${groupId}`);
  };

  const formatLastMessage = (message) => {
    if (!message) return 'No messages yet';
    
    const senderName = message.senderName || 'Unknown';
    const text = message.text || '';
    
    if (text.length > 30) {
      return `${senderName}: ${text.substring(0, 30)}...`;
    }
    return `${senderName}: ${text}`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  if (loading) {
    return (
      <div className="group-list loading">
        <div className="loading-spinner"></div>
        <p>Loading groups...</p>
      </div>
    );
  }

  return (
    <div className="group-list">
      <div className="group-list-header">
        <h3>Your Groups</h3>
        <button 
          className="create-group-btn"
          onClick={() => navigate('/create-group')}
        >
          <FaPlus />
          Create Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="no-groups">
          <FaUsers className="no-groups-icon" />
          <p>You haven't joined any groups yet</p>
          <button 
            className="create-first-group-btn"
            onClick={() => navigate('/create-group')}
          >
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="groups-container">
          {groups.map(group => (
            <div 
              key={group.id} 
              className="group-item"
              onClick={() => handleGroupClick(group.id)}
            >
              <div className="group-avatar">
                <img 
                  src={group.photoURL || '/default-group.png'} 
                  alt={group.name}
                  onError={(e) => {
                    e.target.src = '/default-group.png';
                  }}
                />
                <div className="group-member-count">
                  <FaUsers />
                  <span>{group.members?.length || 0}</span>
                </div>
              </div>

              <div className="group-info">
                <div className="group-header">
                  <h4 className="group-name">
                    {group.name}
                    {group.adminId === currentUser.uid && (
                      <FaCrown className="admin-icon" title="You are admin" />
                    )}
                  </h4>
                  <div className="group-meta">
                    <div className="online-status">
                      <FaCircle className="online-indicator" />
                      <span>{group.onlineCount || 0} online</span>
                    </div>
                    {group.lastMessage && (
                      <span className="last-message-time">
                        {formatTime(group.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="group-last-message">
                  <p>{formatLastMessage(group.lastMessage)}</p>
                </div>
              </div>

              <div className="group-actions">
                <button 
                  className="video-call-btn"
                  onClick={(e) => handleVideoCall(e, group.id)}
                  title="Start group video call"
                >
                  <FaVideo />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupList;