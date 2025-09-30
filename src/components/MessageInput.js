import React, { useState, useRef } from "react";

const MessageInput = ({ onSendMessage, user, uploading }) => {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Send text message if there's text and no media
    if (message.trim() && !selectedImage && !audioBlob) {
      onSendMessage({
        text: message,
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        type: 'text'
      });
      setMessage("");
    }
    
    // Send image message
    if (selectedImage) {
      onSendMessage({
        text: message.trim() || "",
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        type: 'image',
        image: selectedImage
      });
      clearImageSelection();
      setMessage("");
    }
    
    // Send voice message
    if (audioBlob) {
      onSendMessage({
        text: "Voice message",
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        type: 'voice',
        audio: audioBlob
      });
      clearAudioRecording();
      setMessage("");
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const clearImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearAudioRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="message-input-container">
      {/* Image Preview */}
      {imagePreview && (
        <div className="media-preview">
          <img src={imagePreview} alt="Preview" className="image-preview" />
          <button type="button" onClick={clearImageSelection} className="clear-media-btn">
            ✕
          </button>
        </div>
      )}
      
      {/* Audio Preview */}
      {audioBlob && (
        <div className="media-preview">
          <div className="audio-preview">
            <span>🎵 Voice message recorded</span>
            <audio controls src={URL.createObjectURL(audioBlob)} />
          </div>
          <button type="button" onClick={clearAudioRecording} className="clear-media-btn">
            ✕
          </button>
        </div>
      )}
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="recording-indicator">
          <div className="recording-dot"></div>
          <span>Recording... {formatTime(recordingTime)}</span>
        </div>
      )}
      
      <form className="message-input-form" onSubmit={handleSubmit}>
        <div className="input-row">
          {/* Hidden file input */}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          
          {/* Image upload button */}
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="media-btn image-btn"
            title="Upload image"
          >
            📷
          </button>
          
          {/* Voice recording button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`media-btn voice-btn ${isRecording ? 'recording' : ''}`}
            title={isRecording ? "Stop recording" : "Record voice message"}
          >
            {isRecording ? '⏹️' : '🎤'}
          </button>
          
          {/* Text input */}
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="message-input"
          />
          
          {/* Send button */}
          <button 
            type="submit" 
            className="send-btn"
            disabled={(!message.trim() && !selectedImage && !audioBlob) || uploading}
          >
            {uploading ? 'Uploading...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;