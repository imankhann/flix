import React, { useState } from 'react';

// Recursive component for displaying episode hierarchy
const EpisodeHierarchy = ({ seriesId }) => {
  const [episodeData, setEpisodeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSeasons, setExpandedSeasons] = useState(new Set([1])); // Season 1 expanded by default

  React.useEffect(() => {
    if (seriesId) {
      fetchEpisodeHierarchy();
    }
  }, [seriesId]);

  const fetchEpisodeHierarchy = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://127.0.0.1:5000/episodes/${seriesId}`);
      const data = await response.json();
      
      if (response.ok) {
        setEpisodeData(data);
      } else {
        setError(data.error || 'Failed to fetch episodes');
      }
    } catch (err) {
      setError('Error fetching episode data');
      console.error('Episode fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSeason = (seasonNumber) => {
    setExpandedSeasons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seasonNumber)) {
        newSet.delete(seasonNumber);
      } else {
        newSet.add(seasonNumber);
      }
      return newSet;
    });
  };

  if (loading) {
    return <div className="episode-loading">Loading episodes...</div>;
  }

  if (error) {
    return <div className="episode-error">Error: {error}</div>;
  }

  if (!episodeData || !episodeData.seasons || episodeData.seasons.length === 0) {
    return <div className="no-episodes">No episodes found for this series.</div>;
  }

  return (
    <div className="episode-hierarchy">
      <div className="series-header">
        <h3 className="series-title">
          📺 {episodeData.series?.primaryTitle} Episodes
        </h3>
        <div className="series-info">
          {episodeData.series?.startYear && episodeData.series?.endYear && 
            `(${episodeData.series.startYear}-${episodeData.series.endYear})`
          }
          {episodeData.series?.averageRating && 
            <span className="series-rating">★ {episodeData.series.averageRating}</span>
          }
        </div>
      </div>

      <div className="seasons-container">
        {episodeData.seasons.map((season) => (
          <SeasonNode 
            key={season.seasonNumber}
            season={season}
            isExpanded={expandedSeasons.has(season.seasonNumber)}
            onToggle={() => toggleSeason(season.seasonNumber)}
          />
        ))}
      </div>
    </div>
  );
};

// Recursive component for individual season nodes
const SeasonNode = ({ season, isExpanded, onToggle }) => {
  return (
    <div className="season-node">
      <div 
        className="season-header" 
        onClick={onToggle}
      >
        <span className="season-toggle">
          {isExpanded ? '📂' : '📁'}
        </span>
        <span className="season-title">
          Season {season.seasonNumber} 
          <span className="episode-count">({season.episodeCount} episodes)</span>
        </span>
      </div>
      
      {isExpanded && (
        <div className="episodes-container">
          {season.episodes.map((episode) => (
            <EpisodeNode 
              key={episode.tconst}
              episode={episode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Component for individual episode nodes
const EpisodeNode = ({ episode }) => {
  return (
    <div className="episode-node">
      <span className="episode-number">
        E{episode.episodeNumber || '?'}
      </span>
      <span className="episode-title">
        {episode.primaryTitle}
      </span>
      {episode.averageRating && (
        <span className="episode-rating">
          ★ {episode.averageRating}
        </span>
      )}
    </div>
  );
};

export default EpisodeHierarchy; 