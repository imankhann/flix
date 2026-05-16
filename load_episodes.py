import csv
import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()
conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password=os.getenv('DB_PASSWORD'),
    database="flix"
)
cursor = conn.cursor()

def insert_data(table, columns, values):
    if not values:
        return
    placeholders = ", ".join(["%s"] * len(values[0]))
    query = f"INSERT IGNORE INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"
    cursor.executemany(query, values)

def load_episode_titles():
    """Load episode titles into titleBasics for our existing TV series"""
    # Get our TV series IDs
    cursor.execute("SELECT tconst FROM titleBasics WHERE titleType = 'tvSeries'")
    tv_series_ids = set(row[0] for row in cursor.fetchall())
    
    print(f"Found {len(tv_series_ids)} TV series: {list(tv_series_ids)[:5]}...")
    
    # Find episodes for our TV series
    episode_ids = set()
    episodes_found = {}
    
    print("Scanning title.episode.tsv for episodes...")
    with open("raw_datasets/title.episode.tsv", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            if row["parentTconst"] in tv_series_ids:
                episode_ids.add(row["tconst"])
                if row["parentTconst"] not in episodes_found:
                    episodes_found[row["parentTconst"]] = 0
                episodes_found[row["parentTconst"]] += 1
                
                if len(episode_ids) >= 500:  # Limit episodes to avoid too much data
                    break
    
    print(f"Found {len(episode_ids)} episodes for our TV series:")
    for series_id, count in episodes_found.items():
        cursor.execute("SELECT primaryTitle FROM titleBasics WHERE tconst = %s", (series_id,))
        series_name = cursor.fetchone()[0]
        print(f"  {series_name}: {count} episodes")
    
    # Load episode data from title.basics.tsv
    print("Loading episode details from title.basics.tsv...")
    episode_data = []
    with open("raw_datasets/title.basics.tsv", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            if row["tconst"] in episode_ids:
                episode_data.append((
                    row["tconst"], row["titleType"], row["primaryTitle"], row["originalTitle"],
                    row["isAdult"] == "1",
                    int(row["startYear"]) if row["startYear"].isdigit() else None,
                    int(row["endYear"]) if row["endYear"].isdigit() else None,
                    int(row["runtimeMinutes"]) if row["runtimeMinutes"].isdigit() else None,
                    row["genres"]
                ))
                if len(episode_data) >= 500:  # Safety limit
                    break
    
    print(f"Inserting {len(episode_data)} episode titles into titleBasics...")
    insert_data("titleBasics", ["tconst", "titleType", "primaryTitle", "originalTitle", "isAdult", "startYear", "endYear", "runtimeMinutes", "genres"], episode_data)
    
    print("Loading episode relationships into titleEpisode...")
    # Now load the episode relationships
    episode_relationships = []
    with open("raw_datasets/title.episode.tsv", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            if row["tconst"] in episode_ids and row["parentTconst"] in tv_series_ids:
                episode_relationships.append((
                    row["tconst"], 
                    row["parentTconst"],
                    int(row["seasonNumber"]) if row["seasonNumber"].isdigit() else None,
                    int(row["episodeNumber"]) if row["episodeNumber"].isdigit() else None
                ))
                if len(episode_relationships) >= 500:
                    break
    
    print(f"Inserting {len(episode_relationships)} episode relationships...")
    insert_data("titleEpisode", ["tconst", "parentTconst", "seasonNumber", "episodeNumber"], episode_relationships)
    
    print("✅ Episode loading complete!")
    
    # Verify results
    cursor.execute("SELECT COUNT(*) FROM titleEpisode")
    episode_count = cursor.fetchone()[0]
    print(f"Total episodes in database: {episode_count}")

if __name__ == "__main__":
    try:
        load_episode_titles()
        conn.commit()
        print("✅ All changes committed successfully!")
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close() 