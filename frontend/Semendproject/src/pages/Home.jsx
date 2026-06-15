import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/home.css';

const LITERARY_QUOTES = [
  { text: "Either write something worth reading or do something worth writing.", author: "Benjamin Franklin" },
  { text: "There is no greater agony than bearing an untold story inside you.", author: "Maya Angelou" },
  { text: "Words can be like X-rays if you use them properly—they’ll go through anything. You read and you’re pierced.", author: "Aldous Huxley" },
  { text: "A word after a word after a word is power.", author: "Margaret Atwood" },
  { text: "Start writing, no matter what. The water does not flow until the faucet is turned on.", author: "Louis L'Amour" },
  { text: "Tears are words that need to be written.", author: "Paulo Coelho" },
  { text: "Write what should not be forgotten.", author: "Isabel Allende" }
];

const CATEGORY_COVERS = {
  essay: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
  poetry: "https://images.unsplash.com/photo-1516414984260-a170364f229b?auto=format&fit=crop&w=800&q=80",
  fiction: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
  journal: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80"
};

function Home() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);

  // Quote States
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteFade, setQuoteFade] = useState(false);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Reader Modal States
  const [activePost, setActivePost] = useState(null);
  const [readerTheme, setReaderTheme] = useState('theme-day');
  const [readerFontSize, setReaderFontSize] = useState('font-size-md');
  const [scrollPercent, setScrollPercent] = useState(0);

  // Poll Widget States
  const [pollVotes, setPollVotes] = useState({
    fiction: 15,
    essay: 22,
    poetry: 8,
    journal: 12
  });
  const [hasVoted, setHasVoted] = useState(false);

  // Reactions & Comments States
  const [likesMap, setLikesMap] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const [newComment, setNewComment] = useState('');

  // Share Tooltip State
  const [copiedPostId, setCopiedPostId] = useState(null);

  const modalBodyRef = useRef(null);

  useEffect(() => {
    fetchPosts();

    // Load Poll Votes
    const savedVotes = localStorage.getItem('pollVotes');
    if (savedVotes) {
      setPollVotes(JSON.parse(savedVotes));
    }
    setHasVoted(localStorage.getItem('hasVotedPoll') === 'true');

    // Load Reactions
    const savedLikes = localStorage.getItem('likesMap');
    if (savedLikes) {
      setLikesMap(JSON.parse(savedLikes));
    }
    const savedComments = localStorage.getItem('commentsMap');
    if (savedComments) {
      setCommentsMap(JSON.parse(savedComments));
    }
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/posts");
      const publishedPosts = response.data.filter(
        (post) => post.status === "Published"
      );
      setPosts(publishedPosts);
    } catch (error) {
      console.log(error);
    }
  };

  const startWriting = () => {
    const user = localStorage.getItem("user");
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  const scrollToArticles = () => {
    const section = document.getElementById("articles-section");
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Quote Roller
  const rollNewQuote = () => {
    setQuoteFade(true);
    setTimeout(() => {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * LITERARY_QUOTES.length);
      } while (nextIndex === quoteIndex && LITERARY_QUOTES.length > 1);

      setQuoteIndex(nextIndex);
      setQuoteFade(false);
    }, 400);
  };

  // Poll Vote Handler
  const voteCategory = (catKey) => {
    if (hasVoted) return;
    const updatedVotes = {
      ...pollVotes,
      [catKey]: pollVotes[catKey] + 1
    };
    setPollVotes(updatedVotes);
    setHasVoted(true);
    localStorage.setItem('pollVotes', JSON.stringify(updatedVotes));
    localStorage.setItem('hasVotedPoll', 'true');
  };

  // Likes Handler
  const handleLike = (postId) => {
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

    const updatedLikesMap = {
      ...likesMap,
      [postId]: newLikes
    };
    setLikesMap(updatedLikesMap);
    localStorage.setItem('likesMap', JSON.stringify(updatedLikesMap));
  };

  // Comments Handler
  const handleAddComment = (postId) => {
    if (!newComment || newComment.trim() === '') return;
    const postComments = commentsMap[postId] || [];
    const updatedComments = [...postComments, newComment.trim()];

    const updatedCommentsMap = {
      ...commentsMap,
      [postId]: updatedComments
    };
    setCommentsMap(updatedCommentsMap);
    localStorage.setItem('commentsMap', JSON.stringify(updatedCommentsMap));
    setNewComment('');
  };

  // Share Clipboard Handler
  const handleShare = (postId) => {
    const shareUrl = `${window.location.origin}/?post=${postId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedPostId(postId);
      setTimeout(() => setCopiedPostId(null), 2000);
    });
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
      const response = await axios.get(`http://localhost:8080/api/posts/search?query=${encodeURIComponent(query)}`);
      setPosts(response.data);
    } catch (error) {
      console.error("Semantic search failed:", error);
    }
  };

  // Filter & Search Logic (Search matches are resolved by backend)
  const filteredPosts = posts.filter((post) => {
    const postCategory = post.category || 'Essay';
    const matchesCategory =
      selectedCategory === 'All' ||
      postCategory.toLowerCase() === selectedCategory.toLowerCase();

    return matchesCategory;
  });

  // Track scroll inside reader
  const handleModalScroll = () => {
    if (modalBodyRef.current) {
      const element = modalBodyRef.current;
      const totalHeight = element.scrollHeight - element.clientHeight;
      if (totalHeight > 0) {
        const scrolled = (element.scrollTop / totalHeight) * 100;
        setScrollPercent(scrolled);
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
    return () => {
      document.body.style.overflow = '';
    };
  }, [activePost]);

  const openReader = (post) => {
    setActivePost(post);
    setScrollPercent(0);
  };

  const closeReader = () => {
    setActivePost(null);
  };

  // Compute total votes for percentage
  const totalVotes = Object.values(pollVotes).reduce((sum, v) => sum + v, 0);

  return (
    <div className="home-page animate-fade-in">
      {/* Huge Literary Hero Section */}
      <section className="hero-section">
        <div className="hero-decor decor-top"></div>
        <div className="hero-content">
          <span className="hero-badge">The Literary Sanctuary</span>
          <h1>Write. Publish.<br /><span className="accent-text">Inspire.</span></h1>
          <p>
            A distraction-free haven for essays, stories, and thoughts.
            Step into a modern, ecosystem designed to bring your writing to life
            and connect you with readers worldwide.
          </p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={startWriting}>
              Start Writing Now
              <span className="btn-arrow">→</span>
            </button>
            <button className="secondary-btn" onClick={scrollToArticles}>
              Browse Manuscripts
            </button>
          </div>
        </div>
        <div className="hero-decor decor-bottom"></div>
      </section>

      {/* Embedded Reader Poll Widget (Feature 4) */}
      <section className="poll-section animate-slide-up">
        <div className="poll-container">
          <div className="poll-header">
            <span className="poll-badge">Community Voice</span>
            <h2>Reader Poll: What captures your imagination?</h2>
            <p>Vote for your favorite genre to read on PublishPro</p>
          </div>

          <div className="poll-body">
            {!hasVoted ? (
              <div className="poll-options">
                <button onClick={() => voteCategory('essay')} className="poll-option-btn">Essays & Articles ✍️</button>
                <button onClick={() => voteCategory('poetry')} className="poll-option-btn">Poetry & Verse 📜</button>
                <button onClick={() => voteCategory('fiction')} className="poll-option-btn">Fiction & Short Stories 🌲</button>
                <button onClick={() => voteCategory('journal')} className="poll-option-btn">Personal Journals 📖</button>
              </div>
            ) : (
              <div className="poll-results animate-fade-in">
                {Object.entries(pollVotes).map(([category, count]) => {
                  const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  return (
                    <div key={category} className="poll-result-row">
                      <div className="poll-result-info">
                        <span className="poll-result-cat">{category.toUpperCase()}s</span>
                        <span className="poll-result-pct">{percent}% ({count} votes)</span>
                      </div>
                      <div className="poll-result-bar-bg">
                        <div className={`poll-result-bar-fill fill-${category}`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
                <p className="poll-voted-thanks">Thank you for voting! ({totalVotes} total votes)</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Literary Feature Desk Section */}
      <section className="features-section">
        <div className="section-header">
          <h2>The Creative Ecosystem</h2>
          <p>Carefully engineered details to elevate your publishing experience</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon icon-ink"></div>
            <h3>Distraction-Free Inkwell</h3>
            <p>Write essays and notes within a focused writing layout. Tailored fonts and margins create maximum creative comfort.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon icon-desk"></div>
            <h3>The Gutenberg Desk</h3>
            <p>Maintain complete control over your library. Keep drafts secure in your archives, and print to the web with one click.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon icon-ledger"></div>
            <h3>The Readership Ledger</h3>
            <p>Track post statistics, review draft counts, and see what captures your audience's attention through clean analytics.</p>
          </div>
        </div>
      </section>

      {/* Quote Banner with Roller Action */}
      <section className="quote-banner">
        <div className="quote-container">
          <span className="quote-icon">“</span>
          <blockquote className={quoteFade ? 'quote-fade-out' : 'quote-fade-in'}>
            {LITERARY_QUOTES[quoteIndex].text}
          </blockquote>
          <cite className={quoteFade ? 'quote-fade-out' : 'quote-fade-in'}>
            — {LITERARY_QUOTES[quoteIndex].author}
          </cite>

          <button className="roll-quote-btn" onClick={rollNewQuote}>
            Roll New Inspiration 🖋️
          </button>
        </div>
      </section>

      {/* Manuscripts Search and Filter Section */}
      <section id="articles-section" className="articles-section">
        <div className="section-header">
          <h2>Latest Manuscripts</h2>
          <p>Browse recent stories and insights published by our literary community</p>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="filter-controls-container">
          <div className="search-bar-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by manuscript title or text..."
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

        {filteredPosts.length === 0 ? (
          <div className="empty-articles">
            <div className="empty-icon"></div>
            <p>No manuscripts match your search criteria. Be the first to print your words!</p>
            <button className="start-btn-sm" onClick={startWriting}>Start Writing</button>
          </div>
        ) : (
          <div className="articles-grid">
            {filteredPosts.map((post) => {
              const words = post.content ? post.content.replace(/<[^>]*>/g, '').split(/\s+/).length : 0;
              const readTime = Math.max(1, Math.ceil(words / 200));
              const postCategory = post.category || 'Essay';

              // Reactions local metrics
              const postLikes = likesMap[post.id] || 0;
              const isLiked = localStorage.getItem(`liked_${post.id}`) === 'true';
              const postCommentsCount = (commentsMap[post.id] || []).length;

              const coverUrl = post.coverImage || CATEGORY_COVERS[postCategory.toLowerCase()] || CATEGORY_COVERS.essay;
              const excerptText = post.content ? post.content.replace(/<[^>]*>/g, '') : '';
              const excerptToShow = excerptText.length > 180 ? `${excerptText.substring(0, 180)}...` : excerptText;

              return (
                <article key={post.id} className="article-card animate-slide-up">
                  {/* Article Card Cover Art */}
                  <div className="article-card-cover-container" style={{ height: '140px', overflow: 'hidden', borderRadius: '8px 8px 0 0', margin: '-20px -20px 16px -20px' }}>
                    <img src={coverUrl} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <div className="card-meta" style={{ display: 'flex', alignItems: 'center' }}>
                    <span className={`meta-category cat-${postCategory.toLowerCase()}`}>
                      {postCategory.toUpperCase()}
                    </span>
                    <span className="meta-dot">•</span>
                    <span className="meta-time">{readTime} MIN READ</span>

                    {/* Semantic Match Percentage Badge */}
                    {post.similarity !== undefined && post.similarity !== null && post.similarity < 1.0 && (
                      <span className="similarity-badge" style={{ backgroundColor: '#ebf5fb', color: '#2980b9', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', marginLeft: 'auto' }}>
                        🎯 {(post.similarity * 100).toFixed(0)}% Match
                      </span>
                    )}
                  </div>
                  <h3>{post.title}</h3>
                  <p className="article-excerpt">
                    {excerptToShow}
                  </p>

                  {/* Article reactions toolbar */}
                  <div className="card-reactions-bar">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`reaction-btn ${isLiked ? 'liked-active' : ''}`}
                      title={isLiked ? "Unlike" : "Like"}
                    >
                      ❤️ <span>{postLikes}</span>
                    </button>

                    <button
                      onClick={() => openReader(post)}
                      className="reaction-btn"
                      title="Comments"
                    >
                      💬 <span>{postCommentsCount}</span>
                    </button>

                    <button
                      onClick={() => handleShare(post.id)}
                      className="reaction-btn share-btn"
                      title="Copy Link to Share"
                    >
                      🔗 <span>{copiedPostId === post.id ? 'Copied!' : 'Share'}</span>
                    </button>
                  </div>

                  <div className="article-card-footer">
                    <span className="author-name">By Anonymous Author</span>
                    <button className="read-more-link-btn" onClick={() => openReader(post)}>
                      Read Text <span className="arrow">→</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Immersive Landing Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <p className="copyright-text">
            © {new Date().getFullYear()} Sameer & Co. All Rights Reserved.
          </p>
          <div className="student-ids-container">
            <span className="student-id-label">Registration IDs:</span>
            <span className="student-id-badge">2500080004</span>
            <span className="student-id-badge">2500030310</span>
            <span className="student-id-badge">2500090288</span>
          </div>
        </div>
      </footer>

  {/* Full-Page Immersive Reading Modal */ }
{
  activePost && (
    <div className="reader-modal-overlay" onClick={closeReader}>
      <div className="reading-progress-bar" style={{ width: `${scrollPercent}%` }}></div>

      <div className={`reader-modal-content ${readerTheme}`} onClick={(e) => e.stopPropagation()}>

        {/* Customization toolbar */}
        <div className="reader-toolbar">
          <div className="toolbar-left">
            <span className="toolbar-post-cat">{activePost.category || 'Essay'}</span>
          </div>

          <div className="toolbar-controls">
            {/* Font Size Adjusters */}
            <div className="font-size-adjuster">
              <button
                className={`font-btn size-sm ${readerFontSize === 'font-size-sm' ? 'active-control' : ''}`}
                onClick={() => setReaderFontSize('font-size-sm')}
                title="Small Text"
              >
                A-
              </button>
              <button
                className={`font-btn size-md ${readerFontSize === 'font-size-md' ? 'active-control' : ''}`}
                onClick={() => setReaderFontSize('font-size-md')}
                title="Medium Text"
              >
                A
              </button>
              <button
                className={`font-btn size-lg ${readerFontSize === 'font-size-lg' ? 'active-control' : ''}`}
                onClick={() => setReaderFontSize('font-size-lg')}
                title="Large Text"
              >
                A+
              </button>
            </div>

            {/* Color Schemes */}
            <div className="theme-adjuster">
              <button
                className={`theme-btn btn-day ${readerTheme === 'theme-day' ? 'active-control' : ''}`}
                onClick={() => setReaderTheme('theme-day')}
                title="Day Mode"
              ></button>
              <button
                className={`theme-btn btn-dusk ${readerTheme === 'theme-dusk' ? 'active-control' : ''}`}
                onClick={() => setReaderTheme('theme-dusk')}
                title="Dusk Mode"
              ></button>
              <button
                className={`theme-btn btn-night ${readerTheme === 'theme-night' ? 'active-control' : ''}`}
                onClick={() => setReaderTheme('theme-night')}
                title="Night Mode"
              ></button>
            </div>
          </div>

          <button className="reader-close-btn" onClick={closeReader} title="Close Reader">
            × Close
          </button>
        </div>

        {/* Read Text Sheet */}
        <div
          className="reader-scroll-container"
          ref={modalBodyRef}
          onScroll={handleModalScroll}
        >
          <div className="reader-sheet">

            {/* Dynamic Category Cover Image (Feature 5) */}
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
                <span>Manuscript Index #{activePost.id}</span>
                <span>•</span>
                <span>Written by Anonymous</span>
              </div>
              <hr className="divider-lines" />
            </header>

            <div className={`reader-sheet-body ${readerFontSize}`}>
              {activePost.content && activePost.content.split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {/* Comments Thread (Reactions Part 2) */}
            <div className="reader-comments-section">
              <h3>Manuscript Discussion 💬</h3>

              <div className="comments-input-row">
                <input
                  type="text"
                  placeholder="Add to the discussion... write a comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(activePost.id); }}
                  className="comment-text-input"
                />
                <button
                  onClick={() => handleAddComment(activePost.id)}
                  className="comment-submit-btn"
                >
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
  )
}
    </div >
  );
}

export default Home;