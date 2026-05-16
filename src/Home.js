import React, { useState, useEffect, useCallback } from 'react';
import MovieCard from './MovieCard';

const Home = ({onCard}) => {
  const [filters, setFilters] = useState({
    isMovie: false,
    isTV: false,
    minRating: '',
    genre: '',
    isAdult: false,
    isKid: false,
  });

  const [useKidView, setUseKidView] = useState(() => {
    const stored = localStorage.getItem('useKidView');
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem('useKidView', useKidView);
  }, [useKidView]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const loadHomepage = useCallback(async () => {
    try {
      const res = await fetch('http://127.0.0.1:5000/homepage');
      const data = await res.json();
      setFilteredResults(data);
      setHasSubmitted(false); // browsing, not filtered
    } catch (err) {
      console.error(err);
    }
  }, []);

  // on mount, load homepage results
  useEffect(() => {
    loadHomepage();
  }, [loadHomepage]);

  const isFilterSelected = () => {
    return (
      filters.isMovie ||
      filters.isTV ||
      filters.isAdult ||
      filters.isKid ||
      filters.minRating !== "" ||
      filters.genre !== ""
    );
  };

  const handleChange = (e) => {
    const { type, name, value, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFilterSelected()) return;
    setHasSubmitted(true);
    const response = await fetch('http://127.0.0.1:5000/filter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...filters, useKidView }),
    });
    const data = await response.json();
    setFilteredResults(data);
  };

  const handleReset = async() => {
    setFilters({
      isMovie: false,
      isTV: false,
      minRating: '',
      genre: '',
      isAdult: false,
      isKid: false,
    });
    await loadHomepage();
    
  };

  return (
    <section className="page">
      <div style={{ position: 'relative', minHeight: 60 }}>
        <div>
          <h2>Welcome to Flix</h2>
          <p>Select a tab above to explore!</p>
        </div>
        {/* Kid Friendly Toggle Button - styled and lower down */}
        <button
          type="button"
          onClick={() => setUseKidView(v => !v)}
          style={{
            position: 'absolute',
            top: 32,
            right: 32,
            padding: '0.45em 1em',
            background: useKidView ? '#00b894' : '#f1f2f6',
            color: useKidView ? 'white' : '#888',
            border: useKidView ? 'none' : '1.5px solid #ccc',
            borderRadius: '2em',
            fontWeight: 600,
            fontSize: '0.98em',
            boxShadow: useKidView ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
            cursor: useKidView ? 'pointer' : 'default',
            transition: 'background 0.2s, color 0.2s, border 0.2s',
            outline: useKidView ? '2px solid #00b894' : 'none',
            opacity: useKidView ? 1 : 0.85,
            zIndex: 10
          }}
          aria-pressed={useKidView}
        >
          {useKidView ? '✔️ Kid Friendly Only' : 'Kid Friendly Only'}
        </button>
      </div>
      <div className="filter-results-layout">
        <form className="filter-panel" onSubmit={handleSubmit} onReset={handleReset}>
          <h3>Filters</h3>

          <div className="filter-group">
            <label>
              <input
                type="checkbox"
                name="isMovie"
                checked={filters.isMovie}
                onChange={handleChange}
              />
              Movies
            </label>
            <label>
              <input
                type="checkbox"
                name="isTV"
                checked={filters.isTV}
                onChange={handleChange}
              />
              TV Shows
            </label>
          </div>

          {/* Only show Adult/Kid checkboxes if not using kid view */}
          {!useKidView && (
            <div className="filter-group">
              <label>
                <input
                  type="checkbox"
                  name="isAdult"
                  checked={filters.isAdult}
                  onChange={handleChange}
                />
                Adult
              </label>
              <label>
                <input
                  type="checkbox"
                  name="isKid"
                  checked={filters.isKid}
                  onChange={handleChange}
                />
                Kid Friendly
              </label>
            </div>
          )}

          <div className="filter-group">
            <label htmlFor="minRating">Minimum Rating</label>
            <select
              name="minRating"
              id="minRating"
              value={filters.minRating}
              onChange={handleChange}
            >
              <option hidden value="">Select one...</option>
              <option value="5">5.0+</option>
              <option value="6">6.0+</option>
              <option value="7">7.0+</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="genre">Genre</label>
            <select
              name="genre"
              id="genre"
              value={filters.genre}
              onChange={handleChange}
            >
              <option hidden value="">Select one...</option>
              <option value="Action">Action</option>
              <option value="Horror">Horror</option>
              <option value="Romance">Romance</option>
            </select>
          </div>

          <div className="buttons">
            <button type="submit" disabled={!isFilterSelected()}>Apply</button>
            <button type="reset" className="reset" onClick={() => {setFilters({
                isMovie: false,
                isTV: false,
                isAdult: false,
                isKid: false,
                minRating: "",
                genre: "",
              }); setFilteredResults([]);}}>Reset</button>
          </div>
        </form>
        <div className="results-section">
          {filteredResults.length > 0 ? (
            <>
              {hasSubmitted ? (
                <h3>Filtered Results ({filteredResults.length} found)</h3>
              ) : (
                <h3>Discover these movies, tv shows and shorts!</h3>
              )}
              <div className="movie-grid">
                {filteredResults.map(m => (
                  <MovieCard key={m.tconst} movie={m} onClick={onCard} />
                ))}
              </div>
            </>
          ) : (
            hasSubmitted && (
              <>
                <h3>No filtered results</h3>
                <p>Try widening your search criteria.</p>
              </>
            )
          )}
         
        </div>
      </div>
    </section>
  );
};

export default Home; 