import React, { useEffect, useState } from 'react';
import MovieCard from './MovieCard';

const RecentlyConcludedPage = ({ onCard }) => {
  const [shows, setShows] = useState([]);

  useEffect(() => {
    fetch('http://127.0.0.1:5000/recently_concluded')
      .then(res => res.json())
      .then(data => setShows(data))
      .catch(err => console.error('Failed to fetch:', err));
  }, []);

  return (
    <section className="recently-concluded-page">
      <h2 style={{ textAlign: 'center', margin: '1.5rem 0' }}>
        📺 Recently Concluded TV Shows
      </h2>
      <div
        className="movie-grid"
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1rem',
        }}
      >
        {shows.map(show => (
          <MovieCard key={show.tconst} movie={show} onClick={onCard} />
        ))}
      </div>
    </section>
  );
};

export default RecentlyConcludedPage;
