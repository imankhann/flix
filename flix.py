from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv
from flask_cors import CORS
import mysql.connector 
from mysql.connector import Error
from datetime import datetime

load_dotenv()
app = Flask(__name__)
CORS(app)

def get_db_connection():
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password=os.getenv('DB_PASSWORD'),
        database="flix"
    )
    cursor = conn.cursor()
    cursor.execute("SET collation_connection = 'utf8mb4_0900_ai_ci';")
    cursor.close()
    return conn


@app.route("/")
def get_home():
    return jsonify({"message": "Hello World"})

@app.route("/titles")
def get_titles():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT DISTINCT primaryTitle FROM titleBasics")
        rows = cursor.fetchall()
        return jsonify(rows)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route("/top-rated")
def get_top_rated():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT b.tconst, b.runtimeMinutes, r.averageRating, b.originalTitle, b.primaryTitle, b.startYear, AVG(r.averageRating) AS avgRating
            FROM titleRatings r
            JOIN titleBasics b ON r.tconst = b.tconst
            GROUP BY b.tconst, b.primaryTitle, b.startYear
            ORDER BY averageRating DESC
            LIMIT 5;
        """)
        rows = cursor.fetchall()
        return jsonify(rows)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route("/filter", methods=['POST'])
def apply_filters():
    try:
        filters = request.get_json()
        print("Received filters:", filters)
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        # If useKidView is set, use the view
        if filters.get('useKidView'):
            query = """
                SELECT DISTINCT k.tconst, k.runtimeMinutes, k.originalTitle, k.primaryTitle, k.titleType, k.startYear, k.endYear, k.genres, k.isAdult, r.averageRating
                FROM kidFriendlyMovies k
                LEFT JOIN titleRatings r ON k.tconst = r.tconst
                WHERE k.titleType != 'tvepisode'
            """
            params = []
            if filters.get('isMovie') and filters.get('isTV'):
                query += " AND (k.titleType = 'movie' OR k.titleType = 'tvseries')"
            if filters.get('isMovie') and not filters.get('isTV'):
                query += " AND k.titleType = 'movie'"
            if filters.get('isTV') and not filters.get('isMovie'):
                query += " AND k.titleType = 'tvseries'"
            if filters.get('minRating'):
                query += " AND r.averageRating >= %s"
                params.append(float(filters['minRating']))
            if filters.get('genre'):
                query += " AND k.genres LIKE %s"
                params.append(f"%{filters['genre']}%")
            query += " LIMIT 3000;"
            print(params)
            print("my query (kid view):", query)
            cursor.execute(query, tuple(params))
            results = cursor.fetchall()
            print("my results (kid view):", results)
            return jsonify(results)
        # Otherwise, use the existing logic
        query ="""
            SELECT DISTINCT b.tconst, b.runtimeMinutes, b.originalTitle, b.primaryTitle, b.titleType, b.startYear, b.endYear, b.genres, b.isAdult, r.averageRating
            FROM  titleBasics b
            LEFT JOIN titleRatings r ON b.tconst = r.tconst
            WHERE b.titleType != "tvepisode"
        """
        params = []
        if filters.get('isMovie') and filters.get('isTV'):
            query += " AND (b.titleType = 'movie' OR b.titleType = 'tvSeries')"
        if filters.get('isMovie') and not filters.get('isTV'):
            query += " AND b.titleType = 'movie'"
        if filters.get('isTV') and not filters.get('isMovie'):
            query += " AND b.titleType = 'tvSeries'"

        if filters.get('minRating'):
            query += " AND r.averageRating >= %s"
            params.append(float(filters['minRating']))
        if filters.get('genre'):
            query += " AND b.genres LIKE %s"
            params.append(f"%{filters['genre']}%")
        if filters.get('isAdult') and not filters.get('isKid'):
            query += " AND b.isAdult = 1"
        elif filters.get('isKid') and not filters.get('isAdult'):
            query += " AND b.isAdult = 0"
        query += " LIMIT 3000;"
        print(params)
        print("my query:", query)
        cursor.execute(query, tuple(params))
        results = cursor.fetchall()
        print("my results:", results)
        return jsonify(results)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/update_end_year', methods=['POST'])
def update_end_year():
    data = request.get_json()
    tconst = data.get('tconst')
    end_year = data.get('endYear')

    if not tconst or end_year is None:
        return jsonify({'error': 'Missing tconst or endYear'}), 400

    try:
        end_year = int(end_year)
        conn = get_db_connection()
        cursor = conn.cursor()
        print(f"Received update: tconst={tconst}, endYear={end_year}")
        cursor.execute("UPDATE titleBasics SET endYear = %s WHERE tconst = %s;", (end_year, tconst))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/recently_concluded', methods=['GET'])
def get_recently_concluded():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT b.tconst, b.primaryTitle, b.titleType, b.originalTitle, b.startYear, b.endYear,
                   b.runtimeMinutes, b.genres, b.isAdult, r.averageRating
            FROM recentlyConcluded rc
            JOIN titleBasics b ON rc.tconst = b.tconst
            LEFT JOIN titleRatings r ON b.tconst = r.tconst
            WHERE b.endYear IS NOT NULL AND b.endYear <> '\\N'
            ORDER BY rc.addedOn DESC
            LIMIT 300;
        """
        cursor.execute(query)
        results = cursor.fetchall()
        return jsonify(results)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route("/top-directors")
def top_directors():
    try: 
        query = """
            SELECT nb.primaryName AS director_name, COUNT(*) AS movie_count
            FROM titleCrew tc
            JOIN JSON_TABLE(
                CONCAT('["', REPLACE(tc.directors, ',', '","'), '"]'),
                '$[*]' COLUMNS(director_id VARCHAR(20) PATH '$')
            ) AS jt ON TRUE
            JOIN nameBasics nb ON jt.director_id = nb.nconst
            GROUP BY jt.director_id
            ORDER BY movie_count DESC;
        """
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query)
        directors = cursor.fetchall()
        # XXX: dummy data to test ordering functionality until prod data ingested
        directors = [{"director_name": row["director_name"], "movie_count": row["movie_count"]} for row in directors]
        return jsonify(directors)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/individualmovie/<string:movie_id>")
def get_individualmovie(movie_id):
    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        sql = """
            SELECT
              b.tconst,
              b.isAdult,
              b.titleType,
              b.primaryTitle,
              b.originalTitle,
              b.startYear,
              b.endYear,
              b.runtimeMinutes,
              b.genres,
              r.averageRating
            FROM titleBasics b
            LEFT JOIN titleRatings r ON r.tconst = b.tconst
            WHERE b.tconst = %s;
        """
        cursor.execute(sql, (movie_id,))
        row = cursor.fetchone()
        if row:
            return jsonify(row)
        return jsonify({"error": "movie not found"}), 404

    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route("/romance")
def get_romance():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT  b.tconst,
                    b.primaryTitle,
                    b.originalTitle,
                    b.startYear,
                    b.runtimeMinutes,
                    r.averageRating,
                    b.genres
            FROM titleBasics b
            LEFT JOIN titleRatings r ON r.tconst = b.tconst
             WHERE b.genres IS NOT NULL
             AND b.isRomance = 1;      
        """)
        rows = cursor.fetchall()
        return jsonify(rows)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/homepage")
def browse():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT DISTINCT b.tconst, b.runtimeMinutes, b.originalTitle, b.primaryTitle, b.startYear, b.genres, b.isAdult, r.averageRating
            FROM  titleBasics b
            LEFT JOIN titleAkas a ON b.tconst = a.titleId
            LEFT JOIN titleRatings r ON b.tconst = r.tconst
            WHERE b.titleType != "tvepisode"
            LIMIT 50;
        """)
        rows = cursor.fetchall()
        return jsonify(rows)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/delete_movie/<string:movie_id>", methods=['DELETE'])
def delete_movie(movie_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # First, check if the movie exists and get its details
        cursor.execute("SELECT tconst, primaryTitle, titleType FROM titleBasics WHERE tconst = %s", (movie_id,))
        movie = cursor.fetchone()
        
        if not movie:
            return jsonify({"error": "Movie not found"}), 404
        
        # Check how many reviews this movie has before deletion
        cursor.execute("SELECT COUNT(*) as review_count FROM reviews WHERE movie_id = %s", (movie_id,))
        review_count = cursor.fetchone()['review_count']
        
        # Temporarily disable foreign key checks to avoid other table constraints
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        
        # Delete ONLY from titleBasics - trigger will handle reviews
        cursor.execute("DELETE FROM titleBasics WHERE tconst = %s", (movie_id,))
        
        if cursor.rowcount == 0:
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            return jsonify({"error": "Failed to delete movie"}), 500
        
        # Re-enable foreign key checks
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        
        # Check if trigger set the session variable
        cursor.execute("SELECT @reviews_deleted_by_trigger as trigger_count")
        trigger_result = cursor.fetchone()
        
        conn.commit()
        
        response = {
            "message": f"Successfully deleted {movie['titleType']} '{movie['primaryTitle']}'",
            "movie_id": movie_id,
            "deleted_from": "titleBasics only",
            "reviews_deleted_by_trigger": trigger_result['trigger_count'] if trigger_result['trigger_count'] else 0,
            "reviews_expected": review_count,
            "deletion_method": "Trigger-based review deletion"
        }
        
        return jsonify(response), 200
        
    except Error as e:
        # Make sure to re-enable foreign key checks if there's an error
        try:
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            conn.rollback()
        except:
            pass
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/episodes/<string:series_id>")
def get_episode_hierarchy(series_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Recursive CTE to get episode hierarchy
        recursive_query = """
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
            WHERE b.tconst = %s AND b.titleType = 'tvSeries'
            
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
        """
        
        cursor.execute(recursive_query, (series_id,))
        results = cursor.fetchall()
        
        if not results:
            return jsonify({"error": "TV series not found or has no episodes"}), 404
        
        # Organize results into hierarchical structure
        series_info = None
        episodes_by_season = {}
        
        for row in results:
            if row['node_type'] == 'series':
                series_info = row
            else:
                season_num = row['seasonNumber'] or 0
                if season_num not in episodes_by_season:
                    episodes_by_season[season_num] = []
                episodes_by_season[season_num].append(row)
        
        # Structure the response
        response = {
            "series": series_info,
            "seasons": []
        }
        
        # Organize episodes by season
        for season_num in sorted(episodes_by_season.keys()):
            episodes = sorted(episodes_by_season[season_num], 
                            key=lambda x: x['episodeNumber'] or 0)
            response["seasons"].append({
                "seasonNumber": season_num,
                "episodeCount": len(episodes),
                "episodes": episodes
            })
        
        return jsonify(response)
        
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/reviews", methods=['POST'])
def submit_review():
    try:
        data = request.get_json()
        review_info = data.get('review_info', '').strip()
        movie_id = data.get('movie_id', '').strip()
        
        if not review_info or not movie_id:
            return jsonify({"error": "review_info and movie_id are required"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert the review - the trigger and constraint will validate the length
        cursor.execute(
            "INSERT INTO reviews (review_info, movie_id) VALUES (%s, %s)",
            (review_info, movie_id)
        )
        conn.commit()
        
        return jsonify({"message": "Review submitted successfully"}), 201
        
    except mysql.connector.IntegrityError as e:
        if "chk_review_length" in str(e) or "Review must be at most 50 characters" in str(e):
            return jsonify({"error": "Review must be at most 50 characters long"}), 400
        elif "foreign key" in str(e).lower():
            return jsonify({"error": "Invalid movie ID"}), 400
        else:
            return jsonify({"error": "Database constraint violation"}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route("/reviews/<string:movie_id>")
def get_reviews(movie_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT review_id, review_info, created_at
            FROM reviews 
            WHERE movie_id = %s 
            ORDER BY created_at DESC
        """, (movie_id,))
        
        reviews = cursor.fetchall()
        return jsonify(reviews)
        
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    app.run(debug=True)
