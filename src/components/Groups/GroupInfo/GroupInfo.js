import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../../firebase';
import { 
  doc, 
  updateDoc, 
  deleteDoc, 
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  addDoc
} from 'firebase/firestore';
import { 
  FaArrowLeft, 
  FaUsers, 
  FaUserPlus, 
  FaCrown, 
  FaTrash, 
  FaSignOutAlt,
  FaEdit,
  FaUser,
  FaCalendarAlt
} from 'react-icons/fa';
import './GroupInfo.scss';

const GroupInfo = ({ group, onClose, onGroupDeleted, onGroupUpdated }) => {
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState(group.name);
  const [editedGroupDescription, setEditedGroupDescription] = useState(group.description || '');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const currentUser = auth.currentUser;
  const isAdmin = group.admin === currentUser.uid;
  const isCreator = group.createdBy === currentUser.uid;

  // Load group members
  useEffect(() => {
    if (!group.members) return;

    const loadMembers = async () => {
      try {
        const membersQuery = query(
          collection(db, 'users'),
          where('__name__', 'in', group.members)
        );
        
        const unsubscribe = onSnapshot(membersQuery, (snapshot) => {
          const membersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMembers(membersData);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error loading members:', error);
      }
    };

    loadMembers();
  }, [group.members]);

  // Load all users (for adding members)
  useEffect(() => {
    if (!showAddMember) return;

    const loadAllUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => !group.members.includes(user.id) && user.id !== currentUser.uid);
        
        setAllUsers(usersData);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadAllUsers();
  }, [showAddMember, group.members, currentUser.uid]);

  const addMember = async (userId) => {
    if (!isAdmin) {
      alert('Only admins can add members');
      return;
    }

    try {
      setLoading(true);
      const updatedMembers = [...group.members, userId];
      
      await updateDoc(doc(db, 'groups', group.id), {
        members: updatedMembers,
        lastActivity: new Date()
      });

      // Add system message
      await addDoc(collection(db, 'groups', group.id, 'messages'), {
        text: `${allUsers.find(u => u.id === userId)?.displayName || 'A user'} was added to the group`,
        type: 'system',
        createdAt: new Date(),
        senderId: currentUser.uid
      });

      onGroupUpdated({ ...group, members: updatedMembers });
      setShowAddMember(false);
      alert('Member added successfully!');
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (userId) => {
    if (!isAdmin) {
      alert('Only admins can remove members');
      return;
    }

    if (userId === group.createdBy) {
      alert('Cannot remove the group creator');
      return;
    }

    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        setLoading(true);
        const updatedMembers = group.members.filter(id => id !== userId);
        
        await updateDoc(doc(db, 'groups', group.id), {
          members: updatedMembers,
          lastActivity: new Date()
        });

        // Add system message
        const removedUser = members.find(m => m.id === userId);
        await addDoc(collection(db, 'groups', group.id, 'messages'), {
          text: `${removedUser?.displayName || 'A user'} was removed from the group`,
          type: 'system',
          createdAt: new Date(),
          senderId: currentUser.uid
        });

        onGroupUpdated({ ...group, members: updatedMembers });
        alert('Member removed successfully!');
      } catch (error) {
        console.error('Error removing member:', error);
        alert('Failed to remove member. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const makeAdmin = async (userId) => {
    if (!isCreator) {
      alert('Only the group creator can assign admin rights');
      return;
    }

    if (window.confirm('Make this user an admin?')) {
      try {
        setLoading(true);
        await updateDoc(doc(db, 'groups', group.id), {
          admin: userId,
          lastActivity: new Date()
        });

        // Add system message
        const newAdmin = members.find(m => m.id === userId);
        await addDoc(collection(db, 'groups', group.id, 'messages'), {
          text: `${newAdmin?.displayName || 'A user'} is now an admin`,
          type: 'system',
          createdAt: new Date(),
          senderId: currentUser.uid
        });

        onGroupUpdated({ ...group, admin: userId });
        alert('Admin assigned successfully!');
      } catch (error) {
        console.error('Error assigning admin:', error);
        alert('Failed to assign admin. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const leaveGroup = async () => {
    if (isCreator) {
      alert('Group creators cannot leave. Please transfer ownership or delete the group.');
      return;
    }

    if (window.confirm('Are you sure you want to leave this group?')) {
      try {
        setLoading(true);
        const updatedMembers = group.members.filter(id => id !== currentUser.uid);
        
        await updateDoc(doc(db, 'groups', group.id), {
          members: updatedMembers,
          lastActivity: new Date()
        });

        // Add system message
        await addDoc(collection(db, 'groups', group.id, 'messages'), {
          text: `${currentUser.displayName || 'A user'} left the group`,
          type: 'system',
          createdAt: new Date(),
          senderId: currentUser.uid
        });

        navigate('/dashboard');
      } catch (error) {
        console.error('Error leaving group:', error);
        alert('Failed to leave group. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const deleteGroup = async () => {
    if (!isCreator) {
      alert('Only the group creator can delete the group');
      return;
    }

    if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      try {
        setLoading(true);
        
        // Delete all messages first
        const messagesSnapshot = await getDocs(collection(db, 'groups', group.id, 'messages'));
        const deletePromises = messagesSnapshot.docs.map(messageDoc => 
          deleteDoc(doc(db, 'groups', group.id, 'messages', messageDoc.id))
        );
        await Promise.all(deletePromises);

        // Delete the group
        await deleteDoc(doc(db, 'groups', group.id));

        onGroupDeleted();
        navigate('/dashboard');
      } catch (error) {
        console.error('Error deleting group:', error);
        alert('Failed to delete group. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const updateGroupInfo = async () => {
    if (!isAdmin) {
      alert('Only admins can edit group info');
      return;
    }

    try {
      setLoading(true);
      await updateDoc(doc(db, 'groups', group.id), {
        name: editedGroupName.trim(),
        description: editedGroupDescription.trim(),
        lastActivity: new Date()
      });

      onGroupUpdated({ 
        ...group, 
        name: editedGroupName.trim(), 
        description: editedGroupDescription.trim() 
      });
      setShowEditGroup(false);
      alert('Group info updated successfully!');
    } catch (error) {
      console.error('Error updating group:', error);
      alert('Failed to update group info. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group-info-overlay">
      <div className="group-info-container">
        <div className="group-info-header">
          <button onClick={onClose} className="back-btn">
            <FaArrowLeft />
          </button>
          <h2>Group Info</h2>
          {isAdmin && (
            <button 
              onClick={() => setShowEditGroup(!showEditGroup)} 
              className="edit-btn"
              title="Edit group"
            >
              <FaEdit />
            </button>
          )}
        </div>

        <div className="group-info-content">
          {/* Group Details */}
          <div className="group-details-section">
            <div className="group-avatar-large">
              <img
                src={group.photoURL || '/default-group.png'}
                alt={group.name}
                className="group-avatar"
              />
            </div>
            
            {showEditGroup ? (
              <div className="edit-group-form">
                <input
                  type="text"
                  value={editedGroupName}
                  onChange={(e) => setEditedGroupName(e.target.value)}
                  placeholder="Group name"
                  className="edit-input"
                />
                <textarea
                  value={editedGroupDescription}
                  onChange={(e) => setEditedGroupDescription(e.target.value)}
                  placeholder="Group description (optional)"
                  className="edit-textarea"
                  rows="3"
                />
                <div className="edit-actions">
                  <button onClick={updateGroupInfo} disabled={loading} className="save-btn">
                    Save
                  </button>
                  <button onClick={() => setShowEditGroup(false)} className="cancel-btn">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="group-info-text">
                <h3>{group.name}</h3>
                {group.description && <p className="group-description">{group.description}</p>}
                <div className="group-meta">
                  <span>
                    <FaCalendarAlt />
                    Created {new Date(group.createdAt?.toDate()).toLocaleDateString()}
                  </span>
                  <span>
                    <FaUsers />
                    {group.members?.length || 0} members
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Members Section */}
          <div className="members-section">
            <div className="section-header">
              <h4>Members ({members.length})</h4>
              {isAdmin && (
                <button 
                  onClick={() => setShowAddMember(true)} 
                  className="add-member-btn"
                  title="Add member"
                >
                  <FaUserPlus />
                </button>
              )}
            </div>

            <div className="members-list">
              {members.map(member => (
                <div key={member.id} className="member-item">
                  <div className="member-avatar">
                    {member.photoURL ? (
                      <img src={member.photoURL} alt={member.displayName} />
                    ) : (
                      <div className="default-avatar">
                        <FaUser />
                      </div>
                    )}
                    {member.isOnline && <div className="online-indicator"></div>}
                  </div>
                  
                  <div className="member-info">
                    <span className="member-name">{member.displayName || 'Unknown'}</span>
                    <div className="member-roles">
                      {member.id === group.createdBy && <span className="role creator">Creator</span>}
                      {member.id === group.admin && member.id !== group.createdBy && (
                        <span className="role admin">Admin</span>
                      )}
                    </div>
                  </div>

                  {isAdmin && member.id !== currentUser.uid && member.id !== group.createdBy && (
                    <div className="member-actions">
                      {isCreator && member.id !== group.admin && (
                        <button 
                          onClick={() => makeAdmin(member.id)} 
                          className="action-btn promote-btn"
                          title="Make admin"
                        >
                          <FaCrown />
                        </button>
                      )}
                      <button 
                        onClick={() => removeMember(member.id)} 
                        className="action-btn remove-btn"
                        title="Remove member"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Group Actions */}
          <div className="group-actions">
            {!isCreator && (
              <button onClick={leaveGroup} disabled={loading} className="action-btn leave-btn">
                <FaSignOutAlt />
                Leave Group
              </button>
            )}
            
            {isCreator && (
              <button 
                onClick={() => setShowDeleteConfirm(true)} 
                disabled={loading} 
                className="action-btn delete-btn"
              >
                <FaTrash />
                Delete Group
              </button>
            )}
          </div>
        </div>

        {/* Add Member Modal */}
        {showAddMember && (
          <div className="modal-overlay">
            <div className="add-member-modal">
              <div className="modal-header">
                <h3>Add Member</h3>
                <button onClick={() => setShowAddMember(false)} className="close-btn">×</button>
              </div>
              <div className="modal-content">
                {allUsers.length > 0 ? (
                  <div className="users-list">
                    {allUsers.map(user => (
                      <div key={user.id} className="user-item">
                        <div className="user-avatar">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} />
                          ) : (
                            <div className="default-avatar">
                              <FaUser />
                            </div>
                          )}
                        </div>
                        <span className="user-name">{user.displayName || 'Unknown'}</span>
                        <button 
                          onClick={() => addMember(user.id)} 
                          disabled={loading}
                          className="add-btn"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No users available to add.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="modal-overlay">
            <div className="delete-confirm-modal">
              <div className="modal-header">
                <h3>Delete Group</h3>
              </div>
              <div className="modal-content">
                <p>Are you sure you want to delete "{group.name}"? This action cannot be undone.</p>
                <div className="modal-actions">
                  <button onClick={deleteGroup} disabled={loading} className="delete-btn">
                    Delete
                  </button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="cancel-btn">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupInfo;