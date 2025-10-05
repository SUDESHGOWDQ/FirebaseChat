import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { FaArrowLeft, FaUsers, FaCamera, FaCheck, FaTimes, FaSearch, FaUser } from 'react-icons/fa';
import './CreateGroup.scss';

const CreateGroup = () => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUser) return;

      try {
        // Get user's friendships
        const friendshipsQuery = query(
          collection(db, 'friendships'),
          where('users', 'array-contains', currentUser.uid)
        );

        const friendshipsSnapshot = await getDocs(friendshipsQuery);
        const friendIds = [];

        friendshipsSnapshot.docs.forEach(doc => {
          const friendship = doc.data();
          const friendId = friendship.users.find(id => id !== currentUser.uid);
          if (friendId) friendIds.push(friendId);
        });

        if (friendIds.length > 0) {
          // Get friend details
          const usersQuery = query(
            collection(db, 'users'),
            where('__name__', 'in', friendIds)
          );

          const usersSnapshot = await getDocs(usersQuery);
          const friendsData = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          setFriends(friendsData);
        }
      } catch (error) {
        console.error('Error fetching friends:', error);
        setError('Failed to load friends');
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [currentUser]);

  const handleFriendSelect = (friend) => {
    setSelectedFriends(prev => {
      const isSelected = prev.find(f => f.id === friend.id);
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id);
      } else {
        return [...prev, friend];
      }
    });
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    if (selectedFriends.length === 0) {
      setError('Please select at least one friend');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const groupMembers = [currentUser.uid, ...selectedFriends.map(f => f.id)];
      
      const groupData = {
        name: groupName.trim(),
        description: groupDescription.trim(),
        adminId: currentUser.uid,
        members: groupMembers,
        memberDetails: {
          [currentUser.uid]: {
            id: currentUser.uid,
            name: currentUser.displayName || 'Unknown',
            photoURL: currentUser.photoURL || '',
            email: currentUser.email,
            isAdmin: true
          },
          ...selectedFriends.reduce((acc, friend) => {
            acc[friend.id] = {
              id: friend.id,
              name: friend.displayName || 'Unknown',
              photoURL: friend.photoURL || '',
              email: friend.email,
              isAdmin: false
            };
            return acc;
          }, {})
        },
        createdAt: new Date(),
        lastActivity: new Date(),
        photoURL: '',
        settings: {
          anyoneCanAddMembers: false,
          anyoneCanChangeGroupInfo: false
        }
      };

      const groupRef = await addDoc(collection(db, 'groups'), groupData);
      
      // Navigate to the new group
      navigate(`/group/${groupRef.id}`);
    } catch (error) {
      console.error('Error creating group:', error);
      setError('Failed to create group. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="create-group">
      <div className="create-group-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          <FaArrowLeft />
        </button>
        <h2>Create New Group</h2>
      </div>

      <div className="create-group-content">
        <form onSubmit={handleCreateGroup} className="group-form">
          <div className="form-section">
            <h3>Group Information</h3>
            
            <div className="group-avatar-section">
              <div className="group-avatar-placeholder">
                <FaCamera />
                <span>Add Group Photo</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="groupName">Group Name *</label>
              <input
                id="groupName"
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
                maxLength={50}
                required
              />
              <small>{groupName.length}/50</small>
            </div>

            <div className="form-group">
              <label htmlFor="groupDescription">Description (Optional)</label>
              <textarea
                id="groupDescription"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Describe your group..."
                maxLength={200}
                rows={3}
              />
              <small>{groupDescription.length}/200</small>
            </div>
          </div>

          <div className="form-section">
            <h3>Add Members</h3>
            
            <div className="search-friends">
              <div className="search-input-container">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {selectedFriends.length > 0 && (
              <div className="selected-friends">
                <h4>Selected Members ({selectedFriends.length})</h4>
                <div className="selected-list">
                  {selectedFriends.map(friend => (
                    <div key={friend.id} className="selected-friend">
                      {friend.photoURL ? (
                        <img 
                          src={friend.photoURL} 
                          alt={friend.displayName}
                        />
                      ) : (
                        <div className="selected-friend-icon">
                          <FaUser />
                        </div>
                      )}
                      <span>{friend.displayName}</span>
                      <button
                        type="button"
                        onClick={() => handleFriendSelect(friend)}
                        className="remove-btn"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="friends-list">
              {loading ? (
                <div className="loading">
                  <div className="loading-spinner"></div>
                  <p>Loading friends...</p>
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="no-friends">
                  <FaUsers className="no-friends-icon" />
                  <p>{searchTerm ? 'No friends found' : 'No friends to add'}</p>
                </div>
              ) : (
                filteredFriends.map(friend => {
                  const isSelected = selectedFriends.find(f => f.id === friend.id);
                  return (
                    <div 
                      key={friend.id} 
                      className={`friend-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleFriendSelect(friend)}
                    >
                      {friend.photoURL ? (
                        <img 
                          src={friend.photoURL} 
                          alt={friend.displayName}
                        />
                      ) : (
                        <div className="friend-item-icon">
                          <FaUser />
                        </div>
                      )}
                      <div className="friend-info">
                        <h4>{friend.displayName || 'Unknown User'}</h4>
                        <p>{friend.email}</p>
                      </div>
                      <div className="selection-indicator">
                        {isSelected ? <FaCheck /> : <div className="checkbox" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => navigate('/dashboard')}
              className="cancel-btn"
              disabled={creating}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="create-btn"
              disabled={creating || !groupName.trim() || selectedFriends.length === 0}
            >
              {creating ? (
                <>
                  <div className="spinner"></div>
                  Creating...
                </>
              ) : (
                <>
                  <FaUsers />
                  Create Group
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;