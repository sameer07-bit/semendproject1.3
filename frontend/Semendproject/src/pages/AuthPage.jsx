import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import API from '../api';
import '../styles/auth.css';

function AuthPage({ setUser, setUserName }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Detect starting mode from route path
  const isLoginRoute = location.pathname === '/login';
  
  // State for toggling slide transition
  const [isLogin, setIsLogin] = useState(isLoginRoute);

  // Sync state with URL path changes
  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);

  // Form states
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: ''
  });

  // Handle Input Changes
  const handleLoginChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignupChange = (e) => {
    setSignupData({
      ...signupData,
      [e.target.name]: e.target.value
    });
  };

  // Submit handlers (exactly matching original logic)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await API.post('/login', loginData);
      
      const message = response.data.message || response.data;
      alert(message);

      if (message === "Login Successful") {
        const loggedUser = response.data.email || loginData.email;
        const loggedName = response.data.name || "Writer";
        localStorage.setItem("user", loggedUser);
        localStorage.setItem("userName", loggedName);
        if (setUser) setUser(loggedUser);
        if (setUserName) setUserName(loggedName);
        navigate('/dashboard');
      }
    } catch (error) {
      console.log(error);
      alert('Login Failed');
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/register', signupData);
      alert('Registration Successful');
      navigate('/login');
    } catch (error) {
      console.log(error);
      alert('Registration Failed');
    }
  };

  return (
    <div className="auth-page-container">
      {/* Visual Overlay to blend into the library scene */}
      <div className="auth-overlay"></div>
      
      {/* Aligned to the plane wall area (right 50%) */}
      <div className="auth-card-container">
        <div className="auth-card-wrapper">
          <div className={`auth-card-slider ${isLogin ? 'show-login' : 'show-signup'}`}>
            
            {/* Slide 1: Login Form */}
            <div className="auth-slide login-slide">
              <form className="auth-form" onSubmit={handleLoginSubmit}>
                <div className="form-header">
                  <span className="brand-dot"></span>
                  <h1>Welcome Back</h1>
                  <p>Open your journal and resume writing.</p>
                </div>
                
                <div className="input-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter email address"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    required
                  />
                </div>

                <button type="submit" className="auth-btn">
                  Sign In
                </button>
                
                <p className="auth-switch-text">
                  New to PublishPro?{' '}
                  <Link to="/signup" className="auth-link">
                    Create Account
                  </Link>
                </p>
              </form>
            </div>

            {/* Slide 2: Signup Form */}
            <div className="auth-slide signup-slide">
              <form className="auth-form" onSubmit={handleSignupSubmit}>
                <div className="form-header">
                  <span className="brand-dot"></span>
                  <h1>Join the Circle</h1>
                  <p>Begin your publishing journey today.</p>
                </div>

                <div className="input-group">
                  <label>Username</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter name"
                    value={signupData.name}
                    onChange={handleSignupChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter email address"
                    value={signupData.email}
                    onChange={handleSignupChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Create security password"
                    value={signupData.password}
                    onChange={handleSignupChange}
                    required
                  />
                </div>

                <button type="submit" className="auth-btn">
                  Register Account
                </button>
                
                <p className="auth-switch-text">
                  Already have an account?{' '}
                  <Link to="/login" className="auth-link">
                    Sign In
                  </Link>
                </p>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
