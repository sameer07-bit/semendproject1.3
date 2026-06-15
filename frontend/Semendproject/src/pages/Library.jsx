import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api';
import '../styles/home.css'; // Reuse core modal and animation styles
import '../styles/library.css'; // Custom library styles

const CATEGORY_COVERS = {
  essay: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
  poetry: "https://images.unsplash.com/photo-1516414984260-a170364f229b?auto=format&fit=crop&w=800&q=80",
  fiction: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
  journal: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80"
};

function Library() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [userEmail, setUserEmail] = useState('');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Read Tracker State (IDs of read posts)
  const [readPostIds, setReadPostIds] = useState([]);

  // Reader Modal States
  const [activePost, setActivePost] = useState(null);
  const [readerTheme, setReaderTheme] = useState('theme-day');
  const [readerFontSize, setReaderFontSize] = useState('font-size-md');
  const [scrollPercent, setScrollPercent] = useState(0);

  // Reactions & Comments States
  const [likesMap, setLikesMap] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const [newComment, setNewComment] = useState('');
  const [copiedPostId, setCopiedPostId] = useState(null);

  const modalBodyRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUserEmail(storedUser);
      // Load user-specific read tracker list
      const savedRead = localStorage.getItem(`read_posts_${storedUser}`);
      if (savedRead) {
        setReadPostIds(JSON.parse(savedRead));
      }
    } else {
      // Guest read tracker list
      const savedRead = localStorage.getItem(`read_posts_guest`);
      if (savedRead) {
        setReadPostIds(JSON.parse(savedRead));
      }
    }

    fetchPosts();

    // Load Reactions/Comments from localStorage
    const savedLikes = localStorage.getItem('likesMap');
    if (savedLikes) {
      setLikesMap(JSON.parse(savedLikes));
    }
    const savedComments = localStorage.getItem('commentsMap');
    if (savedComments) {
      setCommentsMap(JSON.parse(savedComments));
    }
  }, [userEmail]);

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/posts`);
      const publishedPosts = response.data.filter(
        (post) => post.status === "Published" && (post.isPrivate === null || !post.isPrivate)
      );
      setPosts(publishedPosts);
    } catch (error) {
      console.error("Error fetching published manuscripts:", error);
    }
  };

  // Debounced Semantic Search Effect
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm.trim() !== '') {
        performSemanticSearch(searchTerm);
      } else {
        fetchPosts();
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const performSemanticSearch = async (query) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/posts/search?query=${encodeURIComponent(query)}`);
      // filter to public published only
      const searchPublished = response.data.filter(
        (post) => post.status === "Published" && (post.isPrivate === null || !post.isPrivate)
      );
      setPosts(searchPublished);
    } catch (error) {
      console.error("Semantic search failed in Library:", error);
    }
  };

  // Filter Logic
  const filteredPosts = posts.filter((post) => {
    const postCategory = post.category || 'Essay';
    return selectedCategory === 'All' || postCategory.toLowerCase() === selectedCategory.toLowerCase();
  });

  // Mark as Read/Unread Handler
  const toggleReadStatus = (postId, event) => {
    if (event) {
      event.stopPropagation(); // Avoid opening the reader when clicking button on card
    }

    let updatedList;
    if (readPostIds.includes(postId)) {
      updatedList = readPostIds.filter(id => id !== postId);
    } else {
      updatedList = [...readPostIds, postId];
    }
    
    setReadPostIds(updatedList);
    const storageKey = userEmail ? `read_posts_${userEmail}` : `read_posts_guest`;
    localStorage.setItem(storageKey, JSON.stringify(updatedList));
  };

  // Likes Handler
  const handleLike = (postId, event) => {
    if (event) event.stopPropagation();
    const prevLikes = likesMap[postId] || 0;
    const isLiked = localStorage.getItem(`liked_${postId}`) === 'true';

    let newLikes;
    if (isLiked) {
      newLikes = Math.max(0, prevLikes - 1);
      localStorage.setItem(`liked_${postId}`, 'false');
    } else {
      newLikes = prevLikes + 1;
      localStorage.setItem(`liked_${postId}`, 'true');
    }

    const updatedLikesMap = { ...likesMap, [postId]: newLikes };
    setLikesMap(updatedLikesMap);
    localStorage.setItem('likesMap', JSON.stringify(updatedLikesMap));
  };

  // Comments Handler
  const handleAddComment = (postId) => {
    if (!newComment || newComment.trim() === '') return;
    const postComments = commentsMap[postId] || [];
    const updatedComments = [...postComments, newComment.trim()];

    const updatedCommentsMap = { ...commentsMap, [postId]: updatedComments };
    setCommentsMap(updatedCommentsMap);
    localStorage.setItem('commentsMap', JSON.stringify(updatedCommentsMap));
    setNewComment('');
  };

  // Share Clipboard Handler
  const handleShare = (postId, event) => {
    if (event) event.stopPropagation();
    const shareUrl = `${window.location.origin}/?post=${postId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedPostId(postId);
      setTimeout(() => setCopiedPostId(null), 2000);
    });
  };

  // Reader Modal Scroll
  const handleModalScroll = () => {
    if (modalBodyRef.current) {
      const element = modalBodyRef.current;
      const totalHeight = element.scrollHeight - element.clientHeight;
      if (totalHeight > 0) {
        setScrollPercent((element.scrollTop / totalHeight) * 100);
      } else {
        setScrollPercent(0);
      }
    }
  };

  useEffect(() => {
    if (activePost) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [activePost]);

  const openReader = (post) => {
    setActivePost(post);
    setScrollPercent(0);
  };

  return (
    <div className="library-page animate-fade-in">
      <header className="library-hero">
        <div className="library-hero-decor"></div>
        <div className="library-hero-content">
          <span className="library-badge">The Gutenberg Archives</span>
          <h1>Community Library</h1>
          <p>
            Explore all essays, stories, and manuscripts written by the community.
            Keep track of your reading ledger and discover literary creations.
          </p>
        </div>
      </header>

      {/* Filter and Search Section */}
      <section className="library-browse-section">
        <div className="filter-controls-container">
          <div className="search-bar-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search library semantically by query..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-bar-input"
            />
            {searchTerm && (
              <button className="clear-search-btn" onClick={() => setSearchTerm('')}>×</button>
            )}
          </div>

          <div className="category-filter-tabs">
            {['All', 'Essay', 'Poetry', 'Fiction', 'Journal'].map((category) => (
              <button
                key={category}
                className={`filter-tab-btn ${selectedCategory === category ? 'tab-active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}s
              </button>
            ))}
          </div>
        </div>

        {/* Library Grid */}
        {filteredPosts.length === 0 ? (
          <div className="empty-articles">
            <p>No published manuscripts found in the library matching your criteria.</p>
          </div>
        ) : (
          <div className="library-grid">
            {filteredPosts.map((post) => {
              const words = post.content ? post.content.replace(/<[^>]*>/g, '').split(/\s+/).length : 0;
              const readTime = Math.max(1, Math.ceil(words / 200));
              const postCategory = post.category || 'Essay';
              const isRead = readPostIds.includes(post.id);

              const postLikes = likesMap[post.id] || 0;
              const isLiked = localStorage.getItem(`liked_${post.id}`) === 'true';
              const postCommentsCount = (commentsMap[post.id] || []).length;

              const coverUrl = post.coverImage || CATEGORY_COVERS[postCategory.toLowerCase()] || CATEGORY_COVERS.essay;
              const excerptText = post.content ? post.content.replace(/<[^>]*>/g, '') : '';
              const excerptToShow = excerptText.length > 180 ? `${excerptText.substring(0, 180)}...` : excerptText;

              return (
                <div key={post.id} className={`library-card ${isRead ? 'card-read-state' : ''}`} onClick={() => openReader(post)}>
                  <div className="library-card-cover">
                    <img src={coverUrl} alt={post.title} />
                    {isRead && (
                      <div className="read-ribbon">
                        ✓ Read
                      </div>
                    )}
                  </div>
                  
                  <div className="library-card-body">
                    <div className="card-meta">
                      <span className={`meta-category cat-${postCategory.toLowerCase()}`}>
                        {postCategory.toUpperCase()}
                      </span>
                      <span className="meta-dot">•</span>
                      <span className="meta-time">{readTime} MIN READ</span>

                      {post.similarity !== undefined && post.similarity !== null && post.similarity < 1.0 && (
                        <span className="similarity-badge" style={{ marginLeft: 'auto' }}>
                          🎯 {(post.similarity * 100).toFixed(0)}% Match
                        </span>
                      )}
                    </div>

                    <h3>{post.title}</h3>
                    <p className="library-excerpt">{excerptToShow}</p>

                    <div className="card-actions-row">
                      <div className="card-reactions-bar">
                        <button onClick={(e) => handleLike(post.id, e)} className={`reaction-btn ${isLiked ? 'liked-active' : ''}`}>
                          ❤️ <span>{postLikes}</span>
                        </button>
                        <button className="reaction-btn">
                          💬 <span>{postCommentsCount}</span>
                        </button>
                        <button onClick={(e) => handleShare(post.id, e)} className="reaction-btn">
                          🔗 <span>{copiedPostId === post.id ? 'Copied!' : 'Share'}</span>
                        </button>
                      </div>

                      <button
                        className={`mark-read-btn ${isRead ? 'is-read' : ''}`}
                        onClick={(e) => toggleReadStatus(post.id, e)}
                        title={isRead ? "Mark manuscript as unread" : "Mark manuscript as read"}
                      >
                        📖 {isRead ? "Read" : "Mark Read"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Reader Modal */}
      {activePost && (
        <div className="reader-modal-overlay" onClick={() => setActivePost(null)}>
          <div className="reading-progress-bar" style={{ width: `${scrollPercent}%` }}></div>

          <div className={`reader-modal-content ${readerTheme}`} onClick={(e) => e.stopPropagation()}>
            <div className="reader-toolbar">
              <div className="toolbar-left">
                <span className="toolbar-post-cat">{activePost.category || 'Essay'}</span>
                <button
                  className={`modal-mark-read-btn ${readPostIds.includes(activePost.id) ? 'active-read' : ''}`}
                  onClick={() => toggleReadStatus(activePost.id)}
                >
                  {readPostIds.includes(activePost.id) ? "✓ Finished Reading" : "📖 Mark as Read"}
                </button>
              </div>

              <div className="toolbar-controls">
                <div className="font-size-adjuster">
                  {['font-size-sm', 'font-size-md', 'font-size-lg'].map((size, idx) => (
                    <button
                      key={size}
                      className={`font-btn ${readerFontSize === size ? 'active-control' : ''}`}
                      onClick={() => setReaderFontSize(size)}
                    >
                      {idx === 0 ? 'A-' : idx === 1 ? 'A' : 'A+'}
                    </button>
                  ))}
                </div>

                <div className="theme-adjuster">
                  {['theme-day', 'theme-dusk', 'theme-night'].map((t) => (
                    <button
                      key={t}
                      className={`theme-btn btn-${t.split('-')[1]} ${readerTheme === t ? 'active-control' : ''}`}
                      onClick={() => setReaderTheme(t)}
                    />
                  ))}
                </div>
              </div>

              <button className="reader-close-btn" onClick={() => setActivePost(null)}>
                × Close
              </button>
            </div>

            <div className="reader-scroll-container" ref={modalBodyRef} onScroll={handleModalScroll}>
              <div className="reader-sheet">
                <div className="reader-cover-container">
                  <img
                    src={activePost.coverImage || CATEGORY_COVERS[(activePost.category || 'essay').toLowerCase()] || CATEGORY_COVERS.essay}
                    alt={activePost.title}
                    className="reader-cover-image"
                  />
                  <div className="reader-cover-shadow"></div>
                </div>

                <header className="reader-sheet-header">
                  <h1>{activePost.title}</h1>
                  <div className="reader-sheet-meta">
                    <span>Written by: {activePost.authorEmail ? activePost.authorEmail.split('@')[0] : 'Anonymous Author'}</span>
                  </div>
                  <hr className="divider-lines" />
                </header>

                <div 
                  className={`reader-sheet-body ${readerFontSize}`}
                  dangerouslySetInnerHTML={{ __html: activePost.content }}
                />

                {/* Comments Section */}
                <div className="reader-comments-section">
                  <h3>Manuscript Discussion 💬</h3>

                  <div className="comments-input-row">
                    <input
                      type="text"
                      placeholder="Add to the discussion..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(activePost.id); }}
                      className="comment-text-input"
                    />
                    <button onClick={() => handleAddComment(activePost.id)} className="comment-submit-btn">
                      Post Comment
                    </button>
                  </div>

                  <div className="comments-list-box">
                    {(commentsMap[activePost.id] || []).length === 0 ? (
                      <p className="no-comments-text">No comments yet. Start the conversation!</p>
                    ) : (
                      commentsMap[activePost.id].map((commentText, index) => (
                        <div key={index} className="comment-bubble animate-slide-up">
                          <div className="comment-bubble-meta">
                            <span className="commenter-avatar">👤</span>
                            <span className="commenter-name">Anonymous Reader</span>
                          </div>
                          <p className="comment-bubble-text">{commentText}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Library;
