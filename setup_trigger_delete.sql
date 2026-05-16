-- Script to remove CASCADE and use trigger for review deletion
USE flix;

-- Add regular foreign key (no CASCADE)
ALTER TABLE reviews 
ADD CONSTRAINT fk_reviews_movie_no_cascade
FOREIGN KEY (movie_id) REFERENCES titleBasics(tconst);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS delete_reviews_on_movie_deletion;

-- Create trigger to manually delete reviews when movie is deleted
DELIMITER //
CREATE TRIGGER delete_reviews_on_movie_deletion
    BEFORE DELETE ON titleBasics
    FOR EACH ROW
BEGIN
    -- Count reviews before deletion (for logging)
    DECLARE review_count INT DEFAULT 0;
    SELECT COUNT(*) INTO review_count FROM reviews WHERE movie_id = OLD.tconst;
    
    -- Manually delete reviews for this movie
    DELETE FROM reviews WHERE movie_id = OLD.tconst;
    
    -- Set session variable for feedback (optional)
    SET @reviews_deleted_by_trigger = review_count;
END//
DELIMITER ;

-- Verify the setup
SELECT 'Trigger setup complete!' as status;
SELECT 'Reviews will be deleted via trigger, not CASCADE' as method;

-- Show the new constraint
SELECT 
    CONSTRAINT_NAME,
    DELETE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS 
WHERE CONSTRAINT_SCHEMA = 'flix' 
AND TABLE_NAME = 'reviews'; 