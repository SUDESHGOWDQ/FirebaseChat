import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaRedo, FaInfo } from 'react-icons/fa';
import { diagnoseConnection } from '../../utils/webrtcUtils';
import './CallDiagnostics.scss';

const CallDiagnostics = ({ onClose, onRetry }) => {
  const [diagnosis, setDiagnosis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetesting, setIsRetesting] = useState(false);

  const runDiagnosis = async () => {
    setIsLoading(true);
    try {
      const result = await diagnoseConnection();
      setDiagnosis(result);
    } catch (error) {
      console.error('Error running diagnosis:', error);
      setDiagnosis({
        error: 'Failed to run diagnostics',
        recommendations: ['Please refresh the page and try again']
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetest = async () => {
    setIsRetesting(true);
    await runDiagnosis();
    setIsRetesting(false);
  };

  useEffect(() => {
    runDiagnosis();
  }, []);

  const getStatusIcon = (success, error = null) => {
    if (success === true) {
      return <FaCheckCircle className="status-icon success" />;
    } else if (success === false) {
      return <FaTimesCircle className="status-icon error" />;
    } else {
      return <FaExclamationTriangle className="status-icon warning" />;
    }
  };

  const getStatusText = (success, error = null) => {
    if (success === true) {
      return 'Working';
    } else if (success === false) {
      return error || 'Failed';
    } else {
      return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="call-diagnostics-overlay">
        <div className="call-diagnostics">
          <div className="diagnostics-header">
            <h3>Running Connection Diagnostics...</h3>
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!diagnosis) {
    return (
      <div className="call-diagnostics-overlay">
        <div className="call-diagnostics">
          <div className="diagnostics-header">
            <h3>Diagnostics Failed</h3>
            <button onClick={handleRetest} className="btn btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allGood = diagnosis.webrtcSupport?.supported && 
                  diagnosis.microphoneAccess?.success && 
                  diagnosis.cameraAccess?.success && 
                  diagnosis.networkConnectivity;

  return (
    <div className="call-diagnostics-overlay">
      <div className="call-diagnostics">
        <div className="diagnostics-header">
          <h3>Connection Diagnostics</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="diagnostics-content">
          {/* Overall Status */}
          <div className="overall-status">
            {allGood ? (
              <div className="status-good">
                <FaCheckCircle className="status-icon success" />
                <span>All systems ready for calling</span>
              </div>
            ) : (
              <div className="status-issues">
                <FaExclamationTriangle className="status-icon warning" />
                <span>Issues detected that may affect call quality</span>
              </div>
            )}
          </div>

          {/* Individual Tests */}
          <div className="test-results">
            <div className="test-item">
              <div className="test-info">
                {getStatusIcon(diagnosis.webrtcSupport?.supported)}
                <span className="test-name">WebRTC Support</span>
              </div>
              <span className="test-status">
                {getStatusText(diagnosis.webrtcSupport?.supported)}
              </span>
            </div>

            <div className="test-item">
              <div className="test-info">
                {getStatusIcon(diagnosis.microphoneAccess?.success)}
                <span className="test-name">Microphone Access</span>
              </div>
              <span className="test-status">
                {getStatusText(diagnosis.microphoneAccess?.success, diagnosis.microphoneAccess?.error)}
              </span>
            </div>

            <div className="test-item">
              <div className="test-info">
                {getStatusIcon(diagnosis.cameraAccess?.success)}
                <span className="test-name">Camera Access</span>
              </div>
              <span className="test-status">
                {getStatusText(diagnosis.cameraAccess?.success, diagnosis.cameraAccess?.error)}
              </span>
            </div>

            <div className="test-item">
              <div className="test-info">
                {getStatusIcon(diagnosis.networkConnectivity)}
                <span className="test-name">Network Connection</span>
              </div>
              <span className="test-status">
                {getStatusText(diagnosis.networkConnectivity)}
              </span>
            </div>
          </div>

          {/* Error Details */}
          {diagnosis.webrtcSupport?.errors?.length > 0 && (
            <div className="error-details">
              <h4>WebRTC Issues:</h4>
              <ul>
                {diagnosis.webrtcSupport.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {diagnosis.microphoneAccess?.message && (
            <div className="error-details">
              <h4>Microphone Issue:</h4>
              <p>{diagnosis.microphoneAccess.message}</p>
            </div>
          )}

          {diagnosis.cameraAccess?.message && (
            <div className="error-details">
              <h4>Camera Issue:</h4>
              <p>{diagnosis.cameraAccess.message}</p>
            </div>
          )}

          {/* Recommendations */}
          {diagnosis.recommendations?.length > 0 && (
            <div className="recommendations">
              <h4><FaInfo /> Recommendations:</h4>
              <ul>
                {diagnosis.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Solutions */}
          <div className="common-solutions">
            <h4>Common Solutions:</h4>
            <ul>
              <li>Refresh the page and try again</li>
              <li>Check browser permissions for camera/microphone</li>
              <li>Close other apps that might be using your camera/microphone</li>
              <li>Try using a different browser (Chrome, Firefox, Safari)</li>
              <li>Check your internet connection</li>
              <li>Disable browser extensions temporarily</li>
            </ul>
          </div>
        </div>

        <div className="diagnostics-actions">
          <button 
            onClick={handleRetest} 
            className="btn btn-secondary"
            disabled={isRetesting}
          >
            <FaRedo /> {isRetesting ? 'Retesting...' : 'Test Again'}
          </button>
          
          {allGood && onRetry && (
            <button onClick={onRetry} className="btn btn-primary">
              Try Call Again
            </button>
          )}
          
          <button onClick={onClose} className="btn btn-outline">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallDiagnostics;