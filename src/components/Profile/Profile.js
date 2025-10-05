import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../../firebase';
import { updateProfile, updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { FaArrowLeft, FaEdit, FaSave, FaTimes, FaCamera, FaUpload, FaSpinner, FaUser } from 'react-icons/fa';
import './Profile.scss';

const Profile = () => {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;
  const fileInputRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [formData, setFormData] = useState({
    displayName: currentUser?.displayName || '',
    email: currentUser?.email || '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const compressImage = (file, maxWidth = 400, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        const width = img.width * ratio;
        const height = img.height * ratio;
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const validateAndSetFile = (file) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (10MB limit before compression)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    // Compress image before setting
    compressImage(file).then((compressedFile) => {
      if (compressedFile) {
        setSelectedFile(compressedFile);
        setError('');

        // Create preview URL
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target.result);
        };
        reader.readAsDataURL(compressedFile);
      }
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const uploadPhoto = async () => {
    if (!selectedFile) return null;

    setPhotoUploading(true);
    try {
      // Create a unique filename with timestamp
      const timestamp = Date.now();
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `profile_${currentUser.uid}_${timestamp}.${fileExtension}`;
      
      // Create storage reference
      const storageRef = ref(storage, `profileImages/${fileName}`);
      
      // Upload file to Firebase Storage
      const snapshot = await uploadBytes(storageRef, selectedFile);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // If user had a previous profile image, try to delete it
      if (currentUser.photoURL && currentUser.photoURL.includes('firebase')) {
        try {
          // Extract filename from previous URL to delete old image
          const oldImageRef = ref(storage, currentUser.photoURL);
          await deleteObject(oldImageRef);
        } catch (error) {
          console.log('Could not delete old profile image:', error);
          // Don't throw error - it's okay if old image can't be deleted
        }
      }
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw new Error('Failed to upload photo. Please try again.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const removePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let photoURL = currentUser.photoURL;

      // Upload new photo if selected
      if (selectedFile) {
        photoURL = await uploadPhoto();
      }

      // Update display name or photo if changed
      if (formData.displayName !== currentUser.displayName || photoURL !== currentUser.photoURL) {
        await updateProfile(currentUser, {
          displayName: formData.displayName,
          photoURL: photoURL
        });

        // Update in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          displayName: formData.displayName,
          photoURL: photoURL
        });
      }

      // Update password if provided
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          setError("Passwords don't match");
          setLoading(false);
          return;
        }

        if (formData.newPassword.length < 6) {
          setError("Password should be at least 6 characters");
          setLoading(false);
          return;
        }

        await updatePassword(currentUser, formData.newPassword);
      }

      setSuccess('Profile updated successfully!');
      setEditing(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFormData({
        ...formData,
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFormData({
      displayName: currentUser?.displayName || '',
      email: currentUser?.email || '',
      newPassword: '',
      confirmPassword: ''
    });
    setError('');
    setSuccess('');
  };

  if (!currentUser) {
    return (
      <div className="profile-error">
        <h3>User not found</h3>
        <button onClick={() => navigate('/login')} className="btn btn-primary">
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          <FaArrowLeft />
          Back to Dashboard
        </button>
        
        <h1>Profile Settings</h1>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar-section">
            <div className="avatar-container">
              {(previewUrl || currentUser.photoURL) ? (
                <img
                  src={previewUrl || currentUser.photoURL}
                  alt="Profile"
                  className="profile-avatar"
                />
              ) : (
                <div className="profile-avatar-icon">
                  <FaUser />
                </div>
              )}
              
              {editing && (
                <div className="avatar-edit-overlay">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="change-photo-btn"
                    disabled={photoUploading}
                  >
                    {photoUploading ? (
                      <FaSpinner className="spinning" />
                    ) : (
                      <FaCamera />
                    )}
                  </button>
                  
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="remove-photo-btn"
                      disabled={photoUploading}
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {editing && (
              <div
                className="photo-drop-zone"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <FaUpload />
                <p>Drag & drop a photo here or click the camera icon</p>
                <small>Supports: JPEG, PNG, GIF, WebP (max 5MB)</small>
              </div>
            )}

            <h2>{currentUser.displayName || 'User'}</h2>
            <p className="user-email">{currentUser.email}</p>
          </div>

          <form onSubmit={handleSave} className="profile-form">
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <div className="input-with-action">
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="Enter your display name"
                />
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="edit-btn"
                  >
                    <FaEdit />
                  </button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                disabled
                className="disabled-input"
              />
              <small>Email cannot be changed</small>
            </div>

            {editing && (
              <>
                <div className="form-group">
                  <label htmlFor="newPassword">New Password (optional)</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm new password"
                  />
                </div>
              </>
            )}

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {editing && (
              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  <FaTimes />
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  <FaSave />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;