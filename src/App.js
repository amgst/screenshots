import React, { useState, useEffect } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [url, setUrl] = useState('');
  const [screenshots, setScreenshots] = useState({
    desktop: null,
    mobile: null
  });
  const [activeTab, setActiveTab] = useState('desktop');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('unknown');
  const [progress, setProgress] = useState({
    desktop: { status: 'pending', progress: 0 },
    mobile: { status: 'pending', progress: 0 }
  });
  const [highQuality, setHighQuality] = useState(false);
  const [captureTime, setCaptureTime] = useState(null);

  // Test backend connection on component mount
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/test');
        if (response.ok) {
          const data = await response.json();
          console.log('Backend connection test:', data);
          setBackendStatus('connected');
        } else {
          setBackendStatus('error');
        }
      } catch (err) {
        console.error('Backend connection test failed:', err);
        setBackendStatus('disconnected');
      }
    };

    checkBackendConnection();
  }, []);

  // Simulate progress updates
  useEffect(() => {
    let progressInterval = null;
    
    if (isLoading) {
      let desktopStep = 1;
      let mobileStep = 0;
      
      progressInterval = setInterval(() => {
        setProgress(prevProgress => {
          // Update desktop progress
          let newDesktopProgress = { ...prevProgress.desktop };
          let newMobileProgress = { ...prevProgress.mobile };
          
          if (desktopStep === 1) {
            newDesktopProgress = { status: 'started', progress: 10 };
            desktopStep = 2;
          } else if (desktopStep === 2) {
            newDesktopProgress = { status: 'loading', progress: 30 };
            desktopStep = 3;
          } else if (desktopStep === 3) {
            newDesktopProgress = { status: 'processing', progress: 60 };
            desktopStep = 4;
          } else if (desktopStep === 4) {
            newDesktopProgress = { status: 'capturing', progress: 80 };
            desktopStep = 5;
          } else if (desktopStep === 5 && mobileStep === 0) {
            newDesktopProgress = { status: 'completed', progress: 100 };
            newMobileProgress = { status: 'started', progress: 10 };
            mobileStep = 1;
          } else if (mobileStep === 1) {
            newMobileProgress = { status: 'loading', progress: 30 };
            mobileStep = 2;
          } else if (mobileStep === 2) {
            newMobileProgress = { status: 'processing', progress: 60 };
            mobileStep = 3;
          } else if (mobileStep === 3) {
            newMobileProgress = { status: 'capturing', progress: 80 };
            mobileStep = 4;
          } else if (mobileStep === 4) {
            newMobileProgress = { status: 'completed', progress: 100 };
            mobileStep = 5;
          }
          
          return {
            desktop: newDesktopProgress,
            mobile: newMobileProgress
          };
        });
      }, highQuality ? 2000 : 1000); // Progress updates are faster in normal quality mode
    }
    
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [isLoading, highQuality]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    // Validate and process URL
    let processedUrl = url;
    try {
      // Add https:// if protocol is missing
      if (!url.match(/^https?:\/\//i)) {
        processedUrl = 'https://' + url;
        setUrl(processedUrl);
      }
      
      // Validate URL format
      new URL(processedUrl);
    } catch (err) {
      setError('Please enter a valid URL (e.g., example.com)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setScreenshots({
      desktop: null,
      mobile: null
    });
    setProgress({
      desktop: { status: 'pending', progress: 0 },
      mobile: { status: 'pending', progress: 0 }
    });
    setCaptureTime(null);
    
    try {
      console.log(`Sending request to capture ${processedUrl} (Quality: ${highQuality ? 'High' : 'Normal'})`);
      
      // Send a standard POST request
      const response = await fetch('http://localhost:5000/api/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          url: processedUrl,
          highQuality: highQuality
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Screenshot response:', data);
      
      // Update screenshots and time
      setScreenshots({
        desktop: data.desktopUrl || null,
        mobile: data.mobileUrl || null
      });
      setCaptureTime(data.totalTime);
      
      // Default to desktop view
      setActiveTab('desktop');
      
    } catch (err) {
      console.error('Screenshot error:', err);
      setError(`Failed to generate screenshot: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (type) => {
    const url = screenshots[type];
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}-screenshot-${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const testBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/test');
      const data = await response.json();
      console.log('Backend test response:', data);
      alert(`Backend connection successful: ${data.message}`);
      setBackendStatus('connected');
    } catch (err) {
      console.error('Backend connection test failed:', err);
      alert('Failed to connect to backend: ' + err.message);
      setBackendStatus('disconnected');
    }
  };

  // Progress bar component
  const ProgressBar = ({ status, percent }) => {
    let statusText = '';
    let statusClass = '';
    
    switch(status) {
      case 'pending':
        statusText = 'Waiting...';
        statusClass = 'text-secondary';
        break;
      case 'started':
        statusText = 'Starting...';
        statusClass = 'text-primary';
        break;
      case 'loading':
        statusText = 'Loading page...';
        statusClass = 'text-primary';
        break;
      case 'processing':
        statusText = 'Processing content...';
        statusClass = 'text-info';
        break;
      case 'capturing':
        statusText = 'Capturing screenshot...';
        statusClass = 'text-warning';
        break;
      case 'completed':
        statusText = 'Completed!';
        statusClass = 'text-success';
        break;
      default:
        statusText = status;
        statusClass = 'text-secondary';
    }
    
    return (
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className={statusClass}>{statusText}</span>
          <span>{percent}%</span>
        </div>
        <div className="progress" style={{ height: '10px' }}>
          <div 
            className={`progress-bar ${status === 'completed' ? 'bg-success' : 'progress-bar-striped progress-bar-animated'}`}
            role="progressbar" 
            style={{ width: `${percent}%` }} 
            aria-valuenow={percent} 
            aria-valuemin="0" 
            aria-valuemax="100"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid bg-light min-vh-100 py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-9">
            {/* Backend status indicator */}
            {backendStatus === 'disconnected' && (
              <div className="alert alert-danger mb-4" role="alert">
                <strong>Backend Not Connected!</strong> The screenshot service is not running.
                <button 
                  className="btn btn-sm btn-outline-danger float-end"
                  onClick={testBackendConnection}
                >
                  Test Connection
                </button>
              </div>
            )}
            
            <div className="card shadow">
              <div className="card-header bg-primary text-white">
                <h1 className="h4 mb-0 fw-bold text-center">Website Screenshot Tool</h1>
              </div>
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label htmlFor="urlInput" className="form-label fw-bold">
                      Enter Website URL
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control form-control-lg"
                        id="urlInput"
                        placeholder="example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                      />
                      <button 
                        type="submit" 
                        className="btn btn-primary px-4"
                        disabled={isLoading || backendStatus === 'disconnected'}
                      >
                        {isLoading ? (
                          <span>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Capturing...
                          </span>
                        ) : (
                          'Capture Screenshot'
                        )}
                      </button>
                    </div>
                    
                    <div className="form-check mt-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="highQualityCheck"
                        checked={highQuality}
                        onChange={(e) => setHighQuality(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="highQualityCheck">
                        High Quality Mode (slower but better quality)
                      </label>
                    </div>
                    
                    {error && <div className="text-danger mt-2">{error}</div>}
                    <div className="form-text mt-2">
                      Enter the website domain. https:// will be added automatically if missing.
                    </div>
                  </div>
                </form>
                
                {isLoading && (
                  <div className="py-4">
                    <h5 className="mb-3">Capturing Screenshots...</h5>
                    
                    <div className="card mb-3">
                      <div className="card-header">
                        <strong>Desktop Version</strong>
                      </div>
                      <div className="card-body">
                        <ProgressBar 
                          status={progress.desktop.status} 
                          percent={progress.desktop.progress} 
                        />
                      </div>
                    </div>
                    
                    <div className="card">
                      <div className="card-header">
                        <strong>Mobile Version</strong>
                      </div>
                      <div className="card-body">
                        <ProgressBar 
                          status={progress.mobile.status} 
                          percent={progress.mobile.progress} 
                        />
                      </div>
                    </div>
                    
                    <p className="text-muted text-center mt-3">
                      {highQuality ? 
                        "Using high quality mode. This may take up to 30 seconds for complex websites." :
                        "Using normal quality mode for faster results."}
                    </p>
                  </div>
                )}

                {(screenshots.desktop || screenshots.mobile) && !isLoading && (
                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h2 className="h5 mb-0 fw-bold">Screenshot Results</h2>
                      {captureTime && (
                        <span className="badge bg-info">
                          Completed in {captureTime} seconds
                        </span>
                      )}
                    </div>
                    
                    {/* Tabs for different views */}
                    <ul className="nav nav-tabs mb-3">
                      {screenshots.desktop && (
                        <li className="nav-item">
                          <button 
                            className={`nav-link ${activeTab === 'desktop' ? 'active' : ''}`}
                            onClick={() => setActiveTab('desktop')}
                          >
                            Desktop
                          </button>
                        </li>
                      )}
                      {screenshots.mobile && (
                        <li className="nav-item">
                          <button 
                            className={`nav-link ${activeTab === 'mobile' ? 'active' : ''}`}
                            onClick={() => setActiveTab('mobile')}
                          >
                            Mobile
                          </button>
                        </li>
                      )}
                    </ul>
                    
                    {/* Tab content */}
                    <div className="tab-content">
                      {/* Desktop View */}
                      {activeTab === 'desktop' && screenshots.desktop && (
                        <div className="tab-pane active">
                          <div className="screenshot-container border rounded overflow-hidden">
                            <img 
                              src={screenshots.desktop} 
                              alt="Desktop Screenshot" 
                              className="img-fluid w-100"
                            />
                          </div>
                          <div className="d-grid gap-2 d-md-flex justify-content-md-end mt-3">
                            <button 
                              className="btn btn-outline-secondary" 
                              onClick={() => window.open(screenshots.desktop, '_blank')}
                            >
                              Open Full Image
                            </button>
                            <button 
                              className="btn btn-outline-primary"
                              onClick={() => handleDownload('desktop')}
                            >
                              Download
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Mobile View */}
                      {activeTab === 'mobile' && screenshots.mobile && (
                        <div className="tab-pane active">
                          <div className="d-flex justify-content-center">
                            <div className="screenshot-container border rounded overflow-hidden" style={{ maxWidth: '400px' }}>
                              <img 
                                src={screenshots.mobile} 
                                alt="Mobile Screenshot" 
                                className="img-fluid"
                              />
                            </div>
                          </div>
                          <div className="d-grid gap-2 d-md-flex justify-content-md-end mt-3">
                            <button 
                              className="btn btn-outline-secondary" 
                              onClick={() => window.open(screenshots.mobile, '_blank')}
                            >
                              Open Full Image
                            </button>
                            <button 
                              className="btn btn-outline-primary"
                              onClick={() => handleDownload('mobile')}
                            >
                              Download
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="card-footer bg-white text-center text-muted py-3">
                <small>
                  This tool captures full-page screenshots of any website in both desktop and mobile views.
                  {highQuality ? ' Using high quality mode for better results.' : ' Using normal quality mode for faster results.'}
                </small>
              </div>
            </div>
            
            {/* Debug information for development */}
            <div className="card mt-4">
              <div className="card-header bg-secondary text-white">
                Debug Information
              </div>
              <div className="card-body">
                <div className="mb-2">
                  <strong>Backend Status:</strong> 
                  {backendStatus === 'connected' && <span className="text-success"> Connected</span>}
                  {backendStatus === 'disconnected' && <span className="text-danger"> Disconnected</span>}
                  {backendStatus === 'unknown' && <span className="text-warning"> Checking...</span>}
                  {backendStatus === 'error' && <span className="text-danger"> Error</span>}
                </div>
                <div className="mb-2">
                  <strong>Backend URL:</strong> http://localhost:5000
                </div>
                <div className="mb-2">
                  <strong>Quality Mode:</strong> {highQuality ? 'High (Better quality, slower)' : 'Normal (Faster, optimized)'}
                </div>
                <button 
                  className="btn btn-sm btn-outline-secondary me-2"
                  onClick={testBackendConnection}
                >
                  Test Backend Connection
                </button>
                <button 
                  className="btn btn-sm btn-outline-info"
                  onClick={() => window.open('http://localhost:5000/api/list-screenshots', '_blank')}
                >
                  View All Screenshots
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;