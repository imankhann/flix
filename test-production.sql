-- Iman Ahsan's SQL query (TOP 5 movies with highest average rating)
SELECT b.primaryTitle, b.startYear, AVG(r.averageRating) AS avgRating
FROM titleRatings r
JOIN titleBasics b ON r.tconst = b.tconst
GROUP BY b.primaryTitle, b.startYear
ORDER BY avgRating DESC
LIMIT 5;

-- Arvind's SQL query (Director with the most movies/All directors' movie counts, if you remove LIMIT 1)
SELECT nb.primaryName AS director_name, COUNT(*) AS movie_count
FROM titleCrew tc
JOIN JSON_TABLE(
    CONCAT('["', REPLACE(tc.directors, ',', '","'), '"]'),
    '$[*]' COLUMNS(director_id VARCHAR(20) PATH '$')
) AS jt ON TRUE
JOIN nameBasics nb ON jt.director_id = nb.nconst
GROUP BY jt.director_id
ORDER BY movie_count DESC;


-- Iman Khan's SQL query (single movie info)
SELECT
    b.primaryTitle,
    b.originalTitle,
    b.startYear,
    b.runtimeMinutes,
    b.genres,
    r.averageRating,
    (
        SELECT GROUP_CONCAT(n.primaryName SEPARATOR ', ')
        FROM titleCrew c
        JOIN nameBasics n
          ON FIND_IN_SET(n.nconst, c.directors)
        WHERE c.tconst = b.tconst
    ) AS directors,
    (
        SELECT GROUP_CONCAT(n2.primaryName SEPARATOR ', ')
        FROM titlePrincipals p
        JOIN nameBasics n2 ON p.nconst = n2.nconst
        WHERE p.tconst = b.tconst
          AND p.category IN ('actor','actress')
        ORDER BY p.ordering
    ) AS top_cast
FROM titleBasics b
JOIN titleRatings r ON r.tconst = b.tconst
WHERE b.tconst = "tt0000090";


-- Adnan's SQL query (filtering)
SELECT b.primaryTitle, b.startYear, b.genres, b.isAdult, a.region, r.averageRating
FROM titleBasics b
LEFT JOIN titleRatings r ON b.tconst = r.tconst
LEFT JOIN titleAkas a ON b.tconst = a.titleId
WHERE b.isAdult = 0
  AND a.region = 'US'
  AND r.averageRating >= 7
LIMIT 10;

-- Iman Ahsan's SQL query (Updating tv series end date)
UPDATE titleBasics
SET endYear = 2024
WHERE tconst = 'tt0000090';

-- Arvind's Update query for endYear of TV Shows + query to show the update

UPDATE titleBasics SET endYear = 2024 WHERE tconst = 'tt0040031';
select endYear from titleBasics where tconst = 'tt0040031'

-- Arvind's recentlyConcluded trigger + query to show affected rows

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

SELECT b.tconst, b.primaryTitle, b.titleType, b.originalTitle, b.startYear, b.endYear,
  b.runtimeMinutes, b.genres, b.isAdult, r.averageRating
  FROM recentlyConcluded rc
  JOIN titleBasics b ON rc.tconst = b.tconst
  LEFT JOIN titleRatings r ON b.tconst = r.tconst
  WHERE b.endYear IS NOT NULL AND b.endYear <> '\\N'
  ORDER BY rc.addedOn DESC
  LIMIT 300;

-- Iman Ahsan's SQL query (creating view)
CREATE VIEW kidFriendlyMovies AS
SELECT *
FROM titleBasics
WHERE isAdult = 0;

-- Iman Ahsan's SQL query (using the view during filtering)
SELECT b.primaryTitle, b.startYear, b.genres, b.isAdult, a.region, r.averageRating
FROM kidFriendlyMovies b
LEFT JOIN titleRatings r ON b.tconst = r.tconst
LEFT JOIN titleAkas a ON b.tconst = a.titleId
WHERE b.isAdult = 0
  AND a.region = 'US'
  AND r.averageRating >= 7
LIMIT 5;

-- Iman Khans's SQL query (creating index)
ALTER TABLE titleBasics
  ADD COLUMN isRomance TINYINT(1)
    GENERATED ALWAYS AS (genres REGEXP '(^|,)Romance(,|$)') STORED;

CREATE INDEX idx_isRomance ON titleBasics (isRomance);

-- Iman Khan's SQL query (using the index)
SELECT  b.tconst, b.primaryTitle, b.originalTitle, b.startYear,
b.runtimeMinutes, r.averageRating, b.genres
FROM titleBasics b
LEFT JOIN titleRatings r ON r.tconst = b.tconst
WHERE b.genres IS NOT NULL
AND b.isRomance = 1
LIMIT 10;

-- Adnan's SQL query (Recursive CTE for TV Series Episode Hierarchy)
-- Example: Getting episode hierarchy for Kraft Theatre (tt0040031)
WITH RECURSIVE episode_tree AS (
    -- Base case: Get the main series
    SELECT 
        b.tconst,
        b.primaryTitle,
        b.titleType,
        b.startYear,
        b.endYear,
        r.averageRating,
        0 as level,
        'series' as node_type,
        CAST(NULL AS SIGNED) as seasonNumber,
        CAST(NULL AS SIGNED) as episodeNumber,
        b.tconst as root_series
    FROM titleBasics b
    LEFT JOIN titleRatings r ON b.tconst = r.tconst
    WHERE b.tconst = 'tt0040031' AND b.titleType = 'tvSeries'
    
    UNION ALL
    
    -- Recursive case: Get all episodes
    SELECT 
        b.tconst,
        b.primaryTitle,
        b.titleType,
        b.startYear,
        b.endYear,
        r.averageRating,
        et.level + 1 as level,
        'ep' as node_type,
        e.seasonNumber,
        e.episodeNumber,
        et.root_series
    FROM titleEpisode e
    JOIN titleBasics b ON e.tconst = b.tconst
    LEFT JOIN titleRatings r ON b.tconst = r.tconst
    JOIN episode_tree et ON e.parentTconst = et.tconst
)
SELECT * FROM episode_tree 
ORDER BY level, seasonNumber, episodeNumber;

-- Adnan's Deletion Trigger (Movie/TV Show deletion with review cascade)
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

