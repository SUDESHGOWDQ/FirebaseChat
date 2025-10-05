// API endpoints
export const API_ENDPOINTS = {
  USERS: 'users',
  CHATS: 'chats',
  GROUPS: 'groups',
  FRIENDS: 'friends',
  FRIEND_REQUESTS: 'friendRequests',
  CALLS: 'calls',
  GROUP_CALLS: 'groupCalls'
};

// Call types
export const CALL_TYPES = {
  VIDEO: 'video',
  VOICE: 'voice'
};

// Call states
export const CALL_STATES = {
  CONNECTING: 'connecting',
  RINGING: 'ringing',
  ACTIVE: 'active',
  ENDED: 'ended',
  ERROR: 'error'
};

// Friend request statuses
export const FRIEND_REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined'
};

// Message types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system'
};

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// User status
export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away',
  BUSY: 'busy'
};

// Breakpoints
export const BREAKPOINTS = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1200px'
};

// Animation durations
export const ANIMATION_DURATION = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms'
};