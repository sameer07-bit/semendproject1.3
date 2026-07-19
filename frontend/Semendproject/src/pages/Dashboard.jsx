import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api';
import { 
  generateHeadlineSuggestions, 
  improveWritingStyle, 
  checkGrammarAndStyle, 
  summarizeArticleText,
  generateCoverKeywords
} from '../gemini';
import RichTextEditor from '../components/RichTextEditor';
import '../styles/dashboard.css';

const WRITING_PROMPTS = [
  "A train carriage on a rainy evening",
  "The librarian who remembers every checked-out book, except one",
  "An old grandfather clock that ticks backwards once a day",
  "A letter written to yourself that you have no memory of writing",
  "The sound of ink dripping in an empty room at midnight",
  "Write about a pocketwatch that doesn't measure time, but distance",
  "A conversation between a candle and the flame that consumes it"
];

function Dashboard({ user, setUser, userName, setUserName }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  
  // Separate Username State
  const [usernameDisplay, setUsernameDisplay] = useState('');

  // Daily Prompts State
  const [promptIndex, setPromptIndex] = useState(0);
  const [promptFade, setPromptFade] = useState(false);

  // Live Writing Goal State
  const [wordGoal, setWordGoal] = useState(100);

  // Session Time Tracker
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Profile Drawer State
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);

  // Gemini AI Board States
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState(null); // String or Array
  const [activeAiTab, setActiveAiTab] = useState(''); // 'headlines', 'grammar', 'improve', 'summary'

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    status: 'Draft',
    category: 'Essay'
  });

  // New states for version history, drafting, cover images, and settings
  const [currentPostId, setCurrentPostId] = useState(null);
  const [coverImage, setCoverImage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [versions, setVersions] = useState([]);
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem("gemini_api_key") || '');
  const fileInputRef = useRef(null);

  // Track session timer interval
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedName = localStorage.getItem("userName");
    
    if (!storedUser) {
      navigate("/login");
    } else {
      setUserEmail(storedUser);
      setUsernameDisplay(storedName || storedUser.split('@')[0]);
      fetchPosts(storedUser);
    }
    setPromptIndex(Math.floor(Math.random() * WRITING_PROMPTS.length));

    // Listen for Navbar profile drawer trigger
    if (localStorage.getItem("openProfileOnLoad") === "true") {
      setShowProfileDrawer(true);
      localStorage.removeItem("openProfileOnLoad");
    }
  }, []);



  const fetchPosts = async (email = userEmail) => {
    try {
      const targetEmail = email || localStorage.getItem("user");
      if (!targetEmail) return;
      const response = await axios.get(`${API_BASE_URL}/api/posts?userEmail=${targetEmail}`);
      setPosts(response.data);
    } catch (error) {
      console.log("Error fetching posts:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const loadPostIntoEditor = async (post) => {
    setCurrentPostId(post.id);
    setFormData({
      title: post.title || '',
      content: post.content || '',
      status: post.status || 'Draft',
      category: post.category || 'Essay'
    });
    setCoverImage(post.coverImage || '');
    setIsPrivate(post.isPrivate || false);
    loadVersions(post.id);
  };

  const loadVersions = async (postId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/posts/${postId}/versions`);
      setVersions(res.data);
    } catch (err) {
      console.error("Error loading version history:", err);
      setVersions([]);
    }
  };

  const restoreVersion = (ver) => {
    if (window.confirm(`Are you sure you want to load Version ${ver.versionNumber} into the editor?`)) {
      setFormData(prev => ({
        ...prev,
        title: ver.title || '',
        content: ver.content || '',
        status: ver.status || 'Draft',
        category: ver.category || 'Essay'
      }));
      if (ver.coverImage) {
        setCoverImage(ver.coverImage);
      }
    }
  };

  const startNewManuscript = () => {
    setCurrentPostId(null);
    setFormData({
      title: '',
      content: '',
      status: 'Draft',
      category: 'Essay'
    });
    setCoverImage('');
    setIsPrivate(false);
    setVersions([]);
  };

  const handleAutoGenerateCover = async () => {
    if (!formData.title && !formData.content) {
      alert("Please enter a title or write content to generate cover keywords.");
      return;
    }
    setAiLoading(true);
    try {
      let keywords;
      try {
        keywords = await generateCoverKeywords(formData.title, formData.content);
        if (!keywords || keywords.includes("API error") || keywords.includes("unavailable") || keywords.includes("Error")) {
          throw new Error("Gemini rate limit or error");
        }
      } catch (geminiErr) {
        console.warn("Gemini cover keyword generation failed, using title fallback:", geminiErr);
        // Fallback: extract keywords from title
        const titleWords = (formData.title || "")
          .toLowerCase()
          .replace(/[^a-z\s]/g, "")
          .split(/\s+/)
          .filter(w => w.length > 3 && !["with", "from", "that", "this", "your", "their", "about", "here", "there"].includes(w));
        keywords = titleWords.slice(0, 2).join(",") || formData.category || "writing";
      }

      // Format keywords as clean, comma-separated tags for Lorem Flickr search
      const keywordList = keywords
        .split(",")
        .map(k => k.trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
        .filter(k => k.length > 0);
      
      const cleanKeywords = keywordList.join(",") || "writing";
      const url = `https://picsum.photos/seed/${encodeURIComponent(cleanKeywords)}/800/450`;
      setCoverImage(url);
      alert("Selected keywords: \"" + cleanKeywords + "\" and set matching cover photo!");
    } catch (error) {
      console.error(error);
      alert("Failed to generate cover keywords.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleImportCover = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveGeminiKey = () => {
    if (!geminiKey.trim()) {
      localStorage.removeItem("gemini_api_key");
      alert("Custom API Key cleared. Using default environment key.");
      return;
    }
    localStorage.setItem("gemini_api_key", geminiKey.trim());
    alert("Gemini API Key saved successfully. Refreshing AI services...");
  };

  const savePost = async (statusType) => {
    try {
      const postData = {
        ...formData,
        status: statusType,
        coverImage: coverImage,
        isPrivate: isPrivate,
        authorEmail: userEmail || localStorage.getItem("user")
      };

      if (currentPostId) {
        // PUT update request
        const res = await axios.put(`${API_BASE_URL}/api/posts/${currentPostId}`, postData);
        alert(statusType === "Published" ? "Manuscript Updated & Published" : "Manuscript Update Saved");
      } else {
        // POST create request
        const res = await axios.post(`${API_BASE_URL}/api/posts`, postData);
        alert(statusType === "Published" ? "Manuscript Published" : "Draft Manuscript Saved");
        if (res.data && res.data.id) {
          setCurrentPostId(res.data.id);
        }
      }

      fetchPosts(userEmail || localStorage.getItem("user"));
      if (currentPostId) {
        loadVersions(currentPostId);
      }
    } catch (error) {
      console.error("Error saving post:", error);
      alert("Failed to save manuscript.");
    }
  };

  const deletePost = async (id) => {
    if (!window.confirm("Are you sure you want to delete this manuscript?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/posts/${id}`);
      if (currentPostId === id) {
        startNewManuscript();
      }
      fetchPosts(userEmail || localStorage.getItem("user"));
    } catch (error) {
      console.log("Error deleting post:", error);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("userName");
    if (setUser) setUser(null);
    if (setUserName) setUserName("Writer");
    navigate("/login");
  };

  // Roll a new creative writing prompt
  const rollNewPrompt = () => {
    setPromptFade(true);
    setTimeout(() => {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * WRITING_PROMPTS.length);
      } while (nextIndex === promptIndex && WRITING_PROMPTS.length > 1);
      
      setPromptIndex(nextIndex);
      setPromptFade(false);
    }, 300);
  };

  // Set prompt as editor title
  const applyPromptToTitle = () => {
    setFormData({
      ...formData,
      title: WRITING_PROMPTS[promptIndex]
    });
  };



  // AI Trigger Methods calling gemini.js
  const handleAiAction = async (actionType) => {
    setAiLoading(true);
    setShowAiPanel(true);
    setActiveAiTab(actionType);
    setAiOutput(null);

    try {
      let result;
      if (actionType === 'headlines') {
        result = await generateHeadlineSuggestions(formData.content, formData.category);
      } else if (actionType === 'improve') {
        result = await improveWritingStyle(formData.content, formData.category);
      } else if (actionType === 'grammar') {
        result = await checkGrammarAndStyle(formData.content);
      } else if (actionType === 'summary') {
        result = await summarizeArticleText(formData.content);
      }
      setAiOutput(result);
    } catch (error) {
      setAiOutput("Failed to fetch suggestions from Gemini.");
    } finally {
      setAiLoading(false);
    }
  };

  const applyHeadline = (headline) => {
    setFormData(prev => ({
      ...prev,
      title: headline
    }));
    alert("Applied title to editor!");
  };

  const appendAiText = (text) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + (prev.content ? "\n\n" : "") + text
    }));
    alert("Appended paragraph to editor!");
  };

  // Format Timer
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Live writing metric calculations
  const textValue = formData.content || '';
  const wordCount = textValue.trim() === '' ? 0 : textValue.trim().split(/\s+/).length;
  const charCount = textValue.length;
  const readTimeEst = Math.max(1, Math.ceil(wordCount / 200));
  const goalProgress = Math.min(100, Math.round((wordCount / wordGoal) * 100));

  // Compute profile statistics
  const totalWordsWritten = posts.reduce((sum, p) => sum + (p.content ? p.content.trim().split(/\s+/).filter(Boolean).length : 0), 0);
  const avgWordsPerPost = posts.length > 0 ? Math.round(totalWordsWritten / posts.length) : 0;
  
  // Categorize for SVG bar chart
  const essayCount = posts.filter(p => (p.category || 'Essay') === 'Essay').length;
  const poetryCount = posts.filter(p => p.category === 'Poetry').length;
  const fictionCount = posts.filter(p => p.category === 'Fiction').length;
  const journalCount = posts.filter(p => p.category === 'Journal').length;
  const maxCategoryCount = Math.max(1, essayCount, poetryCount, fictionCount, journalCount);

  return (
    <div className='dashboard-page animate-fade-in'>
      
      {/* Dashboard Greeting Banner */}
      <div className='dashboard-banner'>
        <div className='banner-content'>
          <span className='banner-badge'>Creative Desk</span>
          <h1>Welcome Back, <span className='author-hl'>{usernameDisplay}</span></h1>
          <p>Writing Session: <strong>{formatTime(sessionSeconds)}</strong></p>
        </div>
        <div className="banner-actions-group">
          <button onClick={() => setShowProfileDrawer(true)} className='banner-profile-btn'>
            👤 View Profile
          </button>
          <button onClick={logout} className='banner-logout-btn'>
            Leave Desk
          </button>
        </div>
      </div>

      {/* Grid containing Stats & Editor in a split column layout */}
      <div className="dashboard-layout">
        
        {/* Left Column: Analytics & Article Management */}
        <div className="dashboard-sidebar">
          
          {/* Prompts Inspiration Widget */}
          <div className="prompts-card animate-slide-up">
            <div className="prompts-card-header">
              <h3>Inspiration Inkwell</h3>
              <button className="prompt-roll-btn" onClick={rollNewPrompt}>Roll Prompt 🎲</button>
            </div>
            <div className={`prompt-body ${promptFade ? 'prompt-fade-out' : 'prompt-fade-in'}`}>
              <p>"{WRITING_PROMPTS[promptIndex]}"</p>
            </div>
            <button className="prompt-apply-btn" onClick={applyPromptToTitle}>
              Write About This Prompt
            </button>
          </div>

          {/* Stats Panels */}
          <div className="stats-section">
            <h2 className="panel-title">Library Summary</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Texts</h3>
                <h2>{posts.length}</h2>
              </div>

              <div className="stat-card stat-published">
                <h3>Published</h3>
                <h2>
                  {posts.filter(post => post.status === "Published").length}
                </h2>
              </div>

              <div className="stat-card stat-drafts">
                <h3>Drafts</h3>
                <h2>
                  {posts.filter(post => post.status === "Draft").length}
                </h2>
              </div>
            </div>
          </div>

          {/* List of existing manuscripts */}
          <div className="posts-panel">
            <h2 className="panel-title">Your Manuscripts</h2>
            
            {posts.length === 0 ? (
              <div className="empty-panel-state">
                <p>Your library is currently empty.</p>
              </div>
            ) : (
              <div className="dashboard-posts-list">
                {posts.map((post) => (
                  <div 
                    key={post.id} 
                    className={`dashboard-post-card animate-slide-up ${currentPostId === post.id ? 'active-card' : ''}`}
                    onClick={() => loadPostIntoEditor(post)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="card-top-row">
                      <span className={`status-badge badge-${post.status.toLowerCase()}`}>
                        {post.status}
                      </span>
                      <span className="card-meta-category">
                        {post.category || 'Essay'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Stop from triggering card select
                          deletePost(post.id);
                        }}
                        className="card-delete-btn"
                        title="Delete Manuscript"
                      >
                        Delete
                      </button>
                    </div>
                    <h3>{post.title}</h3>
                    <p dangerouslySetInnerHTML={{ __html: post.content && post.content.length > 120 ? `${post.content.substring(0, 120).replace(/<[^>]*>/g, '')}...` : (post.content || '').replace(/<[^>]*>/g, '') }}></p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gemini API Key Settings Panel */}
          <div className="gemini-settings-panel animate-slide-up">
            <h3>🔑 Gemini API Key Settings</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 8px 0' }}>
              If AI features are failing, paste your Google AI Studio API key here:
            </p>
            <div className="api-key-row">
              <input 
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="api-key-input"
              />
              <button onClick={saveGeminiKey} className="api-key-save-btn">Save</button>
            </div>
          </div>

        </div>

        {/* Right Column: Premium Notebook Editor Sheet */}
        <div className="dashboard-main">
          <div className="editor-notebook">
            <div className="notebook-spine"></div>
            
            <div className="notebook-sheet">
              
              {/* Header Controls */}
              <div className="notebook-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <h2>{currentPostId ? `Manuscript #${currentPostId}` : "New Draft"}</h2>
                  {currentPostId && (
                    <button onClick={startNewManuscript} className="prompt-roll-btn" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                      ✍️ Start New Draft
                    </button>
                  )}
                </div>
                
                {/* Category, Goal and Scope Selectors */}
                <div className="editor-notebook-selectors">
                  <div className="selector-group">
                    <label>Category:</label>
                    <select 
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="category-dropdown-select"
                    >
                      <option value="Essay">Essay</option>
                      <option value="Poetry">Poetry</option>
                      <option value="Fiction">Fiction</option>
                      <option value="Journal">Journal</option>
                    </select>
                  </div>

                  <div className="selector-group">
                    <label>Scope:</label>
                    <select 
                      value={isPrivate ? "Private" : "Public"}
                      onChange={(e) => setIsPrivate(e.target.value === "Private")}
                      className="category-dropdown-select"
                    >
                      <option value="Public">🌍 Public</option>
                      <option value="Private">🔒 Private</option>
                    </select>
                  </div>

                  <div className="selector-group">
                    <label>Goal:</label>
                    <select 
                      value={wordGoal}
                      onChange={(e) => setWordGoal(Number(e.target.value))}
                      className="goal-dropdown-select"
                    >
                      <option value="50">50 Words</option>
                      <option value="100">100 Words</option>
                      <option value="250">250 Words</option>
                      <option value="500">500 Words</option>
                      <option value="1000">1000 Words</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Lined Writing Canvas */}
              <div className="notebook-input-fields">
                
                {/* mic and AI utility buttons */}
                <div className="editor-canvas-toolbar">
                  {/* Gemini AI helper triggers */}
                  <div className="ai-actions-row">
                    <button onClick={() => handleAiAction('headlines')} className="ai-action-btn">✨ Title Ideas</button>
                    <button onClick={() => handleAiAction('improve')} className="ai-action-btn">✨ Auto-Write</button>
                    <button onClick={() => handleAiAction('grammar')} className="ai-action-btn">✨ Grammar Scan</button>
                    <button onClick={() => handleAiAction('summary')} className="ai-action-btn">✨ Summarize</button>
                  </div>
                </div>

                <input
                  type="text"
                  name="title"
                  placeholder="Enter manuscript title..."
                  className="notebook-title-input"
                  value={formData.title}
                  onChange={handleChange}
                />

                {/* Cover Image Upload / Selection */}
                <div className="cover-image-section">
                  <h4>Cover Image</h4>
                  <div className="cover-preview-wrapper">
                    {coverImage ? (
                      <img src={coverImage} alt="Cover Preview" className="cover-preview-img" />
                    ) : (
                      <div className="cover-placeholder">
                        🌄 No cover artwork selected
                      </div>
                    )}
                  </div>
                  <div className="cover-actions" style={{ marginBottom: '20px' }}>
                    <button onClick={handleAutoGenerateCover} className="cover-btn cover-btn-generate" disabled={aiLoading}>
                      ✨ AI Select Cover
                    </button>
                    <button onClick={() => fileInputRef.current.click()} className="cover-btn">
                      📂 Import from PC
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImportCover} 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                    />
                    {coverImage && (
                      <button onClick={() => setCoverImage('')} className="cover-btn" style={{ color: '#c0392b', borderColor: 'rgba(192, 57, 43, 0.2)' }}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Custom Rich Text Content Editor */}
                <div style={{ marginBottom: '24px' }}>
                  <RichTextEditor
                    value={formData.content}
                    onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
                    title={formData.title}
                    placeholder="Pour your thoughts onto the page..."
                  />
                </div>
              </div>

              {/* Goal Progress bar widget */}
              <div className="writing-goal-widget">
                <div className="goal-text-row">
                  <span>Goal Progress: {goalProgress}%</span>
                  <span>{wordCount} / {wordGoal} words</span>
                </div>
                <div className="goal-bar-bg">
                  <div 
                    className={`goal-bar-fill ${goalProgress >= 100 ? 'goal-completed' : ''}`}
                    style={{ width: `${goalProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* Metrics footer counters */}
              <div className="editor-notebook-metrics">
                <span>Words: <strong>{wordCount}</strong></span>
                <span>Characters: <strong>{charCount}</strong></span>
                <span>Estimated Read: <strong>{readTimeEst} Min</strong></span>
              </div>

              {/* Version History section */}
              {currentPostId && versions.length > 0 && (
                <div className="versions-section animate-slide-up" style={{ marginBottom: '24px' }}>
                  <h3>📜 Manuscript Version History</h3>
                  <div className="versions-list">
                    {versions.map((ver) => (
                      <div key={ver.id} className="version-item">
                        <div className="version-info">
                          <span className="version-number">Version {ver.versionNumber} ({ver.status})</span>
                          <span className="version-date">Saved {new Date(ver.createdAt).toLocaleString()}</span>
                        </div>
                        <button onClick={() => restoreVersion(ver)} className="version-restore-btn">
                          Load Version
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Floating AI responses console */}
              {showAiPanel && (
                <div className="ai-console-drawer">
                  <div className="ai-drawer-header">
                    <h4>Gemini AI Co-Writer ({activeAiTab.toUpperCase()})</h4>
                    <button className="ai-drawer-close" onClick={() => setShowAiPanel(false)}>×</button>
                  </div>
                  <div className="ai-drawer-body">
                    {aiLoading ? (
                      <div className="ai-loader-spinner">
                        <span className="spinner-quill">🖋️</span>
                        <p>Drafting options using Gemini model...</p>
                      </div>
                    ) : (
                      <div className="ai-output-area">
                        {activeAiTab === 'headlines' && Array.isArray(aiOutput) && (
                          <div className="ai-headline-list">
                            {aiOutput.map((headline, i) => (
                              <div key={i} className="ai-suggested-headline-item">
                                <span>{headline}</span>
                                <button onClick={() => applyHeadline(headline)}>Apply</button>
                              </div>
                            ))}
                          </div>
                        )}
                        {activeAiTab !== 'headlines' && (
                          <div className="ai-text-result-box">
                            <p className="ai-text-result">{aiOutput}</p>
                            {activeAiTab === 'improve' && (
                              <button 
                                className="ai-append-btn" 
                                onClick={() => appendAiText(aiOutput)}
                              >
                                Insert into Draft
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="notebook-actions">
                <button
                  onClick={() => savePost("Draft")}
                  className="editor-btn btn-draft"
                >
                  {currentPostId ? "Save Draft Changes" : "Save Draft"}
                </button>

                <button
                  onClick={() => savePost("Published")}
                  className="editor-btn btn-publish"
                >
                  {currentPostId ? "Update & Publish" : "Publish Manuscript"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Drawer Overlay */}
      {showProfileDrawer && (
        <div className="profile-drawer-overlay" onClick={() => setShowProfileDrawer(false)}>
          <div className="profile-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="profile-drawer-header">
              <h2>User Portfolio</h2>
              <button className="profile-close-btn" onClick={() => setShowProfileDrawer(false)}>×</button>
            </div>
            
            <div className="profile-drawer-body">
              {/* Core User Details */}
              <div className="profile-user-card">
                <div className="profile-avatar">✍️</div>
                <h3>{usernameDisplay}</h3>
                <p className="profile-email">{userEmail}</p>
                <span className="profile-role">Registered Author</span>
              </div>

              {/* Session timer */}
              <div className="profile-timer-card">
                <h4>Session Active Time</h4>
                <div className="session-timer-clock">{formatTime(sessionSeconds)}</div>
                <p>Track your creative focus time in real-time.</p>
              </div>

              {/* Dynamic stats */}
              <div className="profile-stats-panel">
                <h4>Writing Ledger Stats</h4>
                <div className="profile-stats-row">
                  <div className="profile-stat-box">
                    <span>Library Size</span>
                    <strong>{posts.length}</strong>
                  </div>
                  <div className="profile-stat-box">
                    <span>Words Logged</span>
                    <strong>{totalWordsWritten}</strong>
                  </div>
                  <div className="profile-stat-box">
                    <span>Avg. Word Length</span>
                    <strong>{avgWordsPerPost}</strong>
                  </div>
                </div>
              </div>

              {/* Category distribution SVG interactive chart */}
              <div className="profile-chart-panel">
                <h4>Category Distribution</h4>
                <div className="profile-chart-container">
                  <svg viewBox="0 0 400 220" className="profile-svg-chart">
                    {/* Grid lines */}
                    <line x1="50" y1="30" x2="350" y2="30" stroke="rgba(92,62,53,0.1)" strokeDasharray="4" />
                    <line x1="50" y1="90" x2="350" y2="90" stroke="rgba(92,62,53,0.1)" strokeDasharray="4" />
                    <line x1="50" y1="150" x2="350" y2="150" stroke="rgba(92,62,53,0.1)" strokeDasharray="4" />
                    
                    {/* Bottom axis */}
                    <line x1="50" y1="170" x2="350" y2="170" stroke="var(--color-wood-dark)" strokeWidth="2" />
                    
                    {/* Bars for Essay, Poetry, Fiction, Journal */}
                    {/* Essays bar */}
                    <rect 
                      x="70" 
                      y={170 - (essayCount / maxCategoryCount) * 120} 
                      width="40" 
                      height={(essayCount / maxCategoryCount) * 120} 
                      fill="var(--color-forest-green)" 
                      rx="4"
                    />
                    <text x="90" y="190" textAnchor="middle" className="chart-label">Essay</text>
                    <text x="90" y={160 - (essayCount / maxCategoryCount) * 120} textAnchor="middle" className="chart-val">{essayCount}</text>

                    {/* Poetry bar */}
                    <rect 
                      x="150" 
                      y={170 - (poetryCount / maxCategoryCount) * 120} 
                      width="40" 
                      height={(poetryCount / maxCategoryCount) * 120} 
                      fill="var(--color-terracotta)" 
                      rx="4"
                    />
                    <text x="170" y="190" textAnchor="middle" className="chart-label">Poetry</text>
                    <text x="170" y={160 - (poetryCount / maxCategoryCount) * 120} textAnchor="middle" className="chart-val">{poetryCount}</text>

                    {/* Fiction bar */}
                    <rect 
                      x="230" 
                      y={170 - (fictionCount / maxCategoryCount) * 120} 
                      width="40" 
                      height={(fictionCount / maxCategoryCount) * 120} 
                      fill="var(--color-accent-amber)" 
                      rx="4"
                    />
                    <text x="250" y="190" textAnchor="middle" className="chart-label">Fiction</text>
                    <text x="250" y={160 - (fictionCount / maxCategoryCount) * 120} textAnchor="middle" className="chart-val">{fictionCount}</text>

                    {/* Journal bar */}
                    <rect 
                      x="310" 
                      y={170 - (journalCount / maxCategoryCount) * 120} 
                      width="40" 
                      height={(journalCount / maxCategoryCount) * 120} 
                      fill="var(--color-wood-light)" 
                      rx="4"
                    />
                    <text x="330" y="190" textAnchor="middle" className="chart-label">Journal</text>
                    <text x="330" y={160 - (journalCount / maxCategoryCount) * 120} textAnchor="middle" className="chart-val">{journalCount}</text>
                  </svg>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;