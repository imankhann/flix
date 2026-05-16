import React from 'react';

const Directors = ({ directors, sortOrder, toggleSortOrder }) => {
  const sortedDirectors = [...(directors || [])].sort((a, b) => {
    return sortOrder === "asc"
      ? a.movie_count - b.movie_count
      : b.movie_count - a.movie_count;
  });

  return (
    <section className="app-container">
      <h2 className="title">🎥 Most Prolific Directors</h2>
      <button className="sort-button" onClick={toggleSortOrder}>
        Sort: {sortOrder === "asc" ? "Ascending" : "Descending"}
      </button>

      <ul className="title-list">
        {sortedDirectors.map((d, i) => (
          <li className="title-item" key={i}>
            {d.director_name} ({d.movie_count} movies)
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Directors; 