import React, { useEffect, useState } from 'react';
import './App.css';
import './Home.css';
import Home from './Home';
import DetailPage from './DetailPage';
import TopRated from './TopRated';
import Directors from './Directors';
import RecentlyConcluded from './RecentlyConcluded';
import Romance from './Romance';

async function getData(route) {
  const url = `http://127.0.0.1:5000/${route}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    const json = await response.json();
    return json;
  } catch (error) {
    console.error(error.message);
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState("home"); // 'home' | 'top' | 'directors'
  const [topRated, setTopRated] = useState([]);
  const [search, setSearch] = useState("");
  const [directors, setDirectors] = useState([]);
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedId, setSelectedId] = useState(null);
  const [movieDetail, setMovieDetail] = useState(null);
  const [prevPage, setPrevPage] = useState("home");
  const [romanceList, setRomanceList] = useState([]);

  useEffect(() => {
    if (currentPage === "detail" && selectedId) {
      fetch(`http://127.0.0.1:5000/individualmovie/${selectedId}`)
        .then(r => r.json())
        .then(setMovieDetail)
        .catch(console.error);
    }
  }, [currentPage, selectedId]);

  const handleMovieClick = (id) => {
    setSelectedId(id);
    setPrevPage(currentPage);
    setCurrentPage("detail");
  };

  // retrieve top directors data from API
  useEffect(() => {
    if (currentPage === "directors") {
      getData("top-directors").then(data => {
        setDirectors(data);
      });
    }
  }, [currentPage]);

  // toggle sort order for directors
  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
  };

  // go to Top-5 
  useEffect(() => {
    if (currentPage === "top") {
      getData("top-rated").then(data => {
        setTopRated(data);
      });
    }
  }, [currentPage]);

  useEffect(() => {
    if (currentPage === "romance") {
      getData("romance").then(data => setRomanceList(data));
    }
  }, [currentPage]);

  return (
    <>
      {/* Nav Bar */}
      <header className="navbar">
        <div className="nav-inner">
          <span className="logo" onClick={() => setCurrentPage("home")}>🍿</span>
          <nav className="links">
            <a
              href="/"
              className={currentPage === "home" ? "active" : ""}
              onClick={(e) => { e.preventDefault(); setCurrentPage("home"); }}
            >
              Home
            </a>
            <a
              href="/"
              className={currentPage === "top" ? "active" : ""}
              onClick={(e) => { e.preventDefault(); setCurrentPage("top"); }}
            >
              Top Rated
            </a>
            <a
              href="/"
              className={currentPage === "directors" ? "active" : ""}
              onClick={(e) => { e.preventDefault(); setCurrentPage("directors"); }}
            >
              Directors
            </a>
            <a
              href="/"
              className={currentPage === "recent" ? "active" : ""}
              onClick={(e) => { e.preventDefault(); setCurrentPage("recent"); }}
            >
              Recently Concluded
            </a>
            <a
              href="/"
              className={currentPage === "romance" ? "active" : ""}
              onClick={(e) => { e.preventDefault(); setCurrentPage("romance"); }}
            >
              Romance
            </a>
          </nav>

        </div>
      </header>
      {currentPage === "home" && (
        <Home onCard={handleMovieClick}/>
      )}
      {currentPage === "top" && (
        <TopRated topRated={topRated} onCard={handleMovieClick}/>
      )}
      {currentPage === "directors" && (
        <Directors directors={directors} sortOrder={sortOrder} toggleSortOrder={toggleSortOrder}/>
      )}
      {currentPage === "detail" && (
        <DetailPage movie={movieDetail} onBack={() => setCurrentPage(prevPage)} />
      )}
      {currentPage === "recent" && (
        <RecentlyConcluded onCard={handleMovieClick} />
      )}
      {currentPage === "romance" && (
        <Romance movies={romanceList} onCard={handleMovieClick} />
      )}
    </>
  );
}

export default App;
