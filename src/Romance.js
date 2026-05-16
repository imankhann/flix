import React from "react";
import MovieCard from "./MovieCard";

const Romance = ({ movies = [], onCard }) => (
  <section className="page">
    <h2 className="title">💖 Romance Picks</h2>
    <div className="top-rated-movie-grid">
      {movies.map(m => (
        <MovieCard key={m.tconst} movie={m} onClick={onCard} />
      ))}
    </div>
  </section>
);

export default Romance;