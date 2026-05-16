import React from 'react';
import MovieCard from './MovieCard';

const TopRated = ({ topRated =[], onCard}) => (
  <section className="page">
    <h2 className="title">🎬 Top 5 Rated Movies</h2>
    <div className="top-rated-movie-grid">
      {topRated.map(m => <MovieCard key={m.tconst} movie={m} onClick={onCard}/>)}
    </div>
  </section>
);

export default TopRated; 