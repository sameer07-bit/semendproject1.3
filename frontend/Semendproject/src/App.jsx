import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import axios from 'axios';

function App() {
  const [user, setUser] = useState(localStorage.getItem("user"));
  const [userName, setUserName] = useState(localStorage.getItem("userName") || "Writer");

  // Set default auth headers globally if token exists in localStorage
  const token = localStorage.getItem("token");
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  return (
    <>
      <Navbar user={user} userName={userName} setUser={setUser} setUserName={setUserName} />

      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/library' element={<Library />} />
        <Route path='/login' element={<AuthPage setUser={setUser} setUserName={setUserName} />} />
        <Route path='/signup' element={<AuthPage setUser={setUser} setUserName={setUserName} />} />
        <Route path='/dashboard' element={<Dashboard user={user} setUser={setUser} userName={userName} setUserName={setUserName} />} />
      </Routes>
    </>
  );
}

export default App;