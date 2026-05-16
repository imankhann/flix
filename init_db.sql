CREATE DATABASE IF NOT EXISTS flix;
USE flix;

DROP VIEW IF EXISTS kidFriendlyMovies;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS recentlyConcluded;
DROP TABLE IF EXISTS titlePrincipals;
DROP TABLE IF EXISTS titleRatings;
DROP TABLE IF EXISTS titleCrew;
DROP TABLE IF EXISTS titleAkas;
DROP TABLE IF EXISTS titleEpisode;
DROP TABLE IF EXISTS nameBasics; 
DROP TABLE IF EXISTS titleBasics;


-- Title Basics (title.basics.tsv)
CREATE TABLE titleBasics (
    tconst VARCHAR(20) PRIMARY KEY,
    titleType VARCHAR(50),
    primaryTitle VARCHAR(255),
    originalTitle VARCHAR(255),
    isAdult BOOLEAN,
    startYear INT,
    endYear INT,
    runtimeMinutes INT,
    genres VARCHAR(255)
);

-- Ratings table (title.ratings.tsv)
CREATE TABLE titleRatings (
    tconst VARCHAR(20) PRIMARY KEY,
    averageRating FLOAT,
    numVotes INT,
    FOREIGN KEY (tconst) REFERENCES titleBasics(tconst)
);

-- Name Basics (name.basics.tsv)
CREATE TABLE nameBasics (
    nconst VARCHAR(20) PRIMARY KEY,
    primaryName VARCHAR(255),
    birthYear INT,
    deathYear INT,
    primaryProfession VARCHAR(255),
    knownForTitles TEXT
);

-- Title Crew (title.crew.tsv)
CREATE TABLE titleCrew (
    tconst VARCHAR(20),
    directors TEXT,
    writers TEXT,
    PRIMARY KEY (tconst),
    FOREIGN KEY (tconst) REFERENCES titleBasics(tconst)
);

-- Title Principals (title.principals.tsv)
CREATE TABLE titlePrincipals (
    tconst VARCHAR(20),
    ordering INT,
    nconst VARCHAR(20),
    category VARCHAR(100),
    job VARCHAR(255),
    characters TEXT,
    PRIMARY KEY (tconst, ordering, nconst),
    FOREIGN KEY (tconst) REFERENCES titleBasics(tconst),
    FOREIGN KEY (nconst) REFERENCES nameBasics(nconst)
);

-- Title AKAs (title.akas.tsv)
CREATE TABLE titleAkas (
    akaId INT AUTO_INCREMENT PRIMARY KEY,
    titleId VARCHAR(20),
    ordering INT,
    title VARCHAR(255),
    region VARCHAR(10),
    language VARCHAR(10),
    types VARCHAR(50),
    attributes VARCHAR(255),
    isOriginalTitle BOOLEAN,
    FOREIGN KEY (titleId) REFERENCES titleBasics(tconst)
);

-- Title Episodes (title.episode.tsv)
CREATE TABLE titleEpisode (
    tconst VARCHAR(20) PRIMARY KEY,
    parentTconst VARCHAR(20),
    seasonNumber INT,
    episodeNumber INT,
    FOREIGN KEY (tconst) REFERENCES titleBasics(tconst),
    FOREIGN KEY (parentTconst) REFERENCES titleBasics(tconst)
);

-- Recently Concluded
CREATE TABLE recentlyConcluded (
    tconst VARCHAR(20) PRIMARY KEY,
    concludedYear INT NOT NULL,
    addedOn TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tconst) REFERENCES titleBasics(tconst)
);

ALTER TABLE titleBasics
  ADD COLUMN isRomance TINYINT(1)
    GENERATED ALWAYS AS (genres REGEXP '(^|,)Romance(,|$)') STORED;

CREATE INDEX idx_isRomance ON titleBasics (isRomance);

-- Reviews table for movie reviews
CREATE TABLE reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    review_info TEXT NOT NULL,
    movie_id VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES titleBasics(tconst) ON DELETE CASCADE,
    CONSTRAINT chk_review_length CHECK (CHAR_LENGTH(review_info) <= 50)
);

-- Trigger to enforce review length constraint
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

-- Trigger to log when movies with reviews are deleted
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
    
    -- Log the deletion if there are reviews (you could insert into a log table)
    IF review_count > 0 THEN
        -- For now, we'll just ensure the cascade happens
        -- You could add: INSERT INTO deletion_log (movie_id, review_count, deleted_at) VALUES (OLD.tconst, review_count, NOW());
        SET @last_deleted_movie_with_reviews = CONCAT(OLD.primaryTitle, ' had ', review_count, ' reviews that will be deleted');
    END IF;
END//
DELIMITER ;

CREATE VIEW kidFriendlyMovies AS
SELECT *
FROM titleBasics
WHERE isAdult = 0;

DELIMITER //

DELIMITER //

CREATE TRIGGER trg_add_recently_concluded
AFTER UPDATE ON titleBasics
FOR EACH ROW
BEGIN
  DECLARE current_year INT;
  SET current_year = YEAR(CURDATE());

  IF OLD.endYear IS NULL
     AND NEW.endYear IS NOT NULL
     AND NEW.titleType = 'tvSeries'
     AND NEW.endYear >= current_year - 5 THEN

    INSERT IGNORE INTO recentlyConcluded (tconst, concludedYear)
    VALUES (NEW.tconst, NEW.endYear);

  END IF;
END;
//

DELIMITER ;
