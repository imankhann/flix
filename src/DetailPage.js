import React from 'react';
import EpisodeHierarchy from './EpisodeHierarchy';

const DetailPage = ({ movie, onBack }) => {
  const [reviews, setReviews] = React.useState([]);
  const [reviewText, setReviewText] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitMessage, setSubmitMessage] = React.useState('');
  const [showReviewForm, setShowReviewForm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const [isEditingEndYear, setIsEditingEndYear] = React.useState(false);
  const [newEndYear, setNewEndYear] = React.useState('');

  React.useEffect(() => {
    if (movie?.tconst) {
      fetch(`http://127.0.0.1:5000/reviews/${movie.tconst}`)
        .then(r => r.json())
        .then(setReviews)
        .catch(console.error);
    }
  }, [movie?.tconst]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    
    if (!reviewText.trim()) {
      setSubmitMessage('Please enter a review.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const response = await fetch('http://127.0.0.1:5000/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_info: reviewText.trim(),
          movie_id: movie.tconst
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSubmitMessage('Review submitted successfully!');
        setReviewText('');
        setShowReviewForm(false);
        // Refresh reviews
        const reviewsResponse = await fetch(`http://127.0.0.1:5000/reviews/${movie.tconst}`);
        const updatedReviews = await reviewsResponse.json();
        setReviews(updatedReviews);
      } else {
        setSubmitMessage(data.error || 'Failed to submit review');
      }
    } catch (error) {
      setSubmitMessage('Error submitting review. Please try again.');
      console.error('Review submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMovie = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`http://127.0.0.1:5000/delete_movie/${movie.tconst}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`Successfully deleted! ${data.message}\nReviews deleted: ${data.reviews_deleted}`);
        onBack(); // Navigate back to previous page
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Error deleting movie. Please try again.');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!movie) return <p style={{ padding: "2rem" }}>Loading…</p>;

  const genres  = movie.genres?.split(",").join(", ") || "N/A";
  const runtime = movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : "N/A";
  const audience = movie.isAdult ? "Adult" : "Kid Friendly";
  let emoji = '🎬';
  if (movie.titleType === 'tvseries') emoji = '📺';
  else if (movie.titleType === 'short') emoji = '🎞️';

  return (
    <section className="details-page">
      <button className="back-btn details-back-btn-top" onClick={onBack}>
        <span className="details-back-arrow">←</span> Back
      </button>
      <div className="details-content">
        <div className="details-emoji">{emoji}</div>
        <h2 className="details-title">{movie.primaryTitle}</h2>
        <div className="details-original-title">{movie.originalTitle}</div>
        <div className="details-info-grid">
          <div>
              <span className="details-label">Type:</span>{' '}
              {movie.titleType === 'tvSeries'
                ? 'TV Series'
                : movie.titleType === 'movie'
                ? 'Movie'
                : movie.titleType === 'short'
                ? 'Short'
                : movie.titleType}
            </div>
          {movie.titleType === 'tvSeries' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em', marginBottom: '0.4em' }}>
                <span>
                  <span className="details-label">Years:</span> {movie.startYear} –
                  {isEditingEndYear ? (
                    <>
                      <input
                        type="number"
                        min={movie.startYear}
                        max={new Date().getFullYear()}
                        value={newEndYear}
                        onChange={(e) => setNewEndYear(e.target.value)}
                        style={{ width: '5em', padding: '0.3em', marginLeft: '0.5em', fontSize: '1em' }}
                      />
                      <button
                        className="review-button"
                        style={{ padding: '0.4em 0.8em', fontSize: '0.9em' }}
                        onClick={async () => {
                          try {
                            const response = await fetch('http://127.0.0.1:5000/update_end_year', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                tconst: movie.tconst,
                                endYear: newEndYear
                              })
                            });

                            if (!response.ok) {
                              throw new Error('Failed to update end year');
                            }

                            movie.endYear = newEndYear; // Local update for display
                            setIsEditingEndYear(false);
                          } catch (error) {
                            alert('Error updating end year: ' + error.message);
                          }
                        }}
                      >
                        Confirm
                      </button>
                    </>
                  ) : (
                    <>
                      {' '}
                      {movie.endYear && movie.endYear !== '\\N' ? movie.endYear : "?"}
                      {(!movie.endYear || movie.endYear === '\\N') && (
                        <button
                          className="review-button"
                          onClick={() => {
                            setIsEditingEndYear(true);
                            setNewEndYear(new Date().getFullYear());
                          }}
                          style={{ marginLeft: '0.6em', padding: '0.3em 0.6em', fontSize: '0.9em' }}
                        >
                          Update End Year
                        </button>
                      )}
                    </>
                  )}
                </span>
              </div>
              <div><span className="details-label">Episode Length:</span> {runtime}</div>
            </>
          ) : (
            <>
              <div><span className="details-label">Year:</span> {movie.startYear}</div>
              <div><span className="details-label">Runtime:</span> {runtime}</div>
            </>
          )}

          <div><span className="details-label">Audience:</span> {audience}</div>
          <div className="details-genres">
            <span className="details-label">Genres:</span>{' '}
            {genres === '\\N' || !genres ? 'N/A' : genres}
          </div>
          <div><span className="details-label">Avg Rating:</span> <span className="details-rating">{movie.averageRating}</span></div>
        </div>

        {/* Delete Movie Section */}
        <div className="details-section">
          <div className="delete-movie-section">
            {!showDeleteConfirm ? (
              <button 
                className="delete-movie-btn"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
              >
                🗑️ Delete {movie.titleType === 'tvSeries' ? 'TV Series' : 'Movie'}
              </button>
            ) : (
              <div className="delete-confirmation">
                <div className="delete-warning">
                  ⚠️ Are you sure you want to delete "{movie.primaryTitle}"?
                  {reviews.length > 0 && (
                    <div className="cascade-warning">
                      This will also delete {reviews.length} review(s) associated with this {movie.titleType === 'tvSeries' ? 'TV series' : 'movie'}.
                    </div>
                  )}
                </div>
                <div className="delete-buttons">
                  <button 
                    className="confirm-delete-btn"
                    onClick={handleDeleteMovie}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button 
                    className="cancel-delete-btn"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Episode Hierarchy Section - Only for TV Series */}
        {movie.titleType === 'tvSeries' && (
          <div className="details-section">
            <div className="details-section-title">📺 Episodes</div>
            <EpisodeHierarchy 
              seriesId={movie.tconst}
            />
          </div>
        )}
        {/* Reviews Section */}
        <div className="details-section">
          <div className="details-section-title">📝 Reviews ({reviews.length})</div>
          
          {/* Review submission */}
          <div className="review-submission">
            {!showReviewForm ? (
              <button 
                className="review-button" 
                onClick={() => setShowReviewForm(true)}
              >
                Write a Review
              </button>
            ) : (
              <form onSubmit={handleReviewSubmit} className="review-form">
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Write your review here (maximum 50 characters)..."
                  className="review-textarea"
                  rows="6"
                  disabled={isSubmitting}
                />
                <div className="review-char-count">
                  {reviewText.length}/50 characters
                  {reviewText.length > 50 && (
                    <span className="char-count-warning"> (exceeds maximum limit)</span>
                  )}
                </div>
                <div className="review-form-buttons">
                  <button
                    type="submit"
                    className="review-submit-btn"
                    disabled={isSubmitting || !reviewText.trim()}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <button
                    type="button"
                    className="review-cancel-btn"
                    onClick={() => {
                      setShowReviewForm(false);
                      setReviewText('');
                      setSubmitMessage('');
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
                {submitMessage && (
                  <div className={`submit-message ${submitMessage.includes('successfully') ? 'success' : 'error'}`}>
                    {submitMessage}
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Display existing reviews */}
          <div className="reviews-list">
            {reviews.length === 0 ? (
              <p className="no-reviews">No reviews yet. Be the first to write one!</p>
            ) : (
              reviews.map((review) => (
                <div key={review.review_id} className="review-item">
                  <div className="review-date">
                    {new Date(review.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="review-text">{review.review_info}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DetailPage; 