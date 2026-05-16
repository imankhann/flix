-- Script to add cascading delete functionality to existing database
USE flix;

-- First, we need to drop the existing foreign key constraint
-- Get the constraint name (it might be auto-generated)
SET @constraint_name = (
    SELECT CONSTRAINT_NAME 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'flix' 
    AND TABLE_NAME = 'reviews' 
    AND COLUMN_NAME = 'movie_id' 
    AND REFERENCED_TABLE_NAME = 'titleBasics'
);

-- Drop the existing foreign key constraint
SET @sql = CONCAT('ALTER TABLE reviews DROP FOREIGN KEY ', @constraint_name);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add the new foreign key constraint with CASCADE DELETE
ALTER TABLE reviews 
ADD CONSTRAINT fk_reviews_movie_cascade
FOREIGN KEY (movie_id) REFERENCES titleBasics(tconst) ON DELETE CASCADE;

-- Drop the trigger if it already exists
DROP TRIGGER IF EXISTS log_movie_deletion_with_reviews;

-- Create the trigger to log deletions
DELIMITER //
CREATE TRIGGER log_movie_deletion_with_reviews
    BEFORE DELETE ON titleBasics
    FOR EACH ROW
BEGIN
    DECLARE review_count INT DEFAULT 0;
    
    -- Count how many reviews this movie has
    SELECT COUNT(*) INTO review_count 
    FROM reviews 
    WHERE movie_id = OLD.tconst;
    
    -- Log the deletion if there are reviews
    IF review_count > 0 THEN
        -- Store information about the deletion in a session variable
        SET @last_deleted_movie_with_reviews = CONCAT(
            'Movie "', OLD.primaryTitle, '" (', OLD.tconst, ') had ', 
            review_count, ' review(s) that will be cascaded deleted'
        );
    END IF;
END//
DELIMITER ;

-- Test the setup by showing the foreign key constraints
SELECT 
    rc.CONSTRAINT_NAME,
    kcu.TABLE_NAME,
    kcu.COLUMN_NAME,
    kcu.REFERENCED_TABLE_NAME,
    kcu.REFERENCED_COLUMN_NAME,
    rc.DELETE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS rc
JOIN information_schema.KEY_COLUMN_USAGE kcu 
    ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    AND rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
WHERE rc.CONSTRAINT_SCHEMA = 'flix' 
AND kcu.TABLE_NAME = 'reviews';

SELECT 'Cascading delete setup complete!' AS status; 