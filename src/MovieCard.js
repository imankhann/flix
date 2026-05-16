import React from 'react';

const MovieCard = ({ movie, onClick }) => {
  if (!movie) return null;

  const runtime = movie.runtimeMinutes ? `${movie.runtimeMinutes} minutes` : "N/A";

  return (
    <div className="movie-card" onClick={()=> onClick(movie.tconst)}>
      <h3 className="movie-card__title">{movie.primaryTitle}</h3>
      <div className="movie-card__body">
        {movie.titleType === 'tvSeries' ? (
          <p><strong>🗓️ Years:</strong> {movie.startYear} – {movie.endYear || "?"}</p>
        ) : (
          <p><strong>🗓️ Year:</strong> {movie.startYear}</p>
        )}
        <p><strong>🕒 Runtime:</strong> {runtime}</p>
        <p><strong>📈 Avg Rating:</strong> {movie.averageRating}</p>
      </div>
    </div>
  );
};

export default MovieCard; 