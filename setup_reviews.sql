-- Setup script for adding reviews functionality to existing database
-- Run this if you already have your database set up and just need to add the reviews table

USE flix;

-- Drop table if it exists (for clean setup)
DROP TABLE IF EXISTS reviews;

-- Create reviews table
CREATE TABLE reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    review_info TEXT NOT NULL,
    movie_id VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES titleBasics(tconst),
    CONSTRAINT chk_review_length CHECK (CHAR_LENGTH(review_info) <= 50)
);

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS review_length_trigger;

-- Create trigger to enforce review length constraint
DELIMITER //
CREATE TRIGGER review_length_trigger
    BEFORE INSERT ON reviews
    FOR EACH ROW
BEGIN
    IF CHAR_LENGTH(NEW.review_info) > 50 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Review must be at most 50 characters long';
    END IF;
END//
DELIMITER ;

-- Show table structure to confirm setup
DESCRIBE reviews;

SELECT 'Reviews table setup complete!' AS status; 