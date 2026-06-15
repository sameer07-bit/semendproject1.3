import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import axios from 'axios';

import '../styles/home.css';

function Home() {

  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);

  useEffect(() => {

    fetchPosts();

  }, []);

  const fetchPosts = async () => {

    try {

      const response =
        await axios.get(
          "http://localhost:8080/api/posts"
        );

      const publishedPosts =
        response.data.filter(
          (post) => post.status === "Published"
        );

      setPosts(publishedPosts);

    } catch (error) {

      console.log(error);
    }
  };

  const startWriting = () => {

    const user =
      localStorage.getItem("user");

    if (user) {

      navigate("/dashboard");

    } else {

      navigate("/login");
    }
  };

  return (

    <div className="home-page">

      <div className="hero-section">

        <div className="hero-content">

          <h1>
            Write. Publish. Inspire.
          </h1>

          <p>
            A modern platform to create,
            manage and publish your content
            beautifully.
          </p>

          <button onClick={startWriting}>
            Start Writing
          </button>

        </div>

      </div>

      <div className="articles-section">

        <h2>Latest Articles</h2>

        {

          posts.length === 0 ? (

            <p>No published articles yet.</p>

          ) : (

            posts.map((post) => (

              <div
                key={post.id}
                className="article-card"
              >

                <h3>{post.title}</h3>

                <p>{post.content}</p>

              </div>
            ))
          )
        }

      </div>

    </div>
  );
}

export default Home;