import csv
import mysql.connector
import os
from dotenv import load_dotenv

MAX_ROWS = 1000

load_dotenv()
conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password=os.getenv('DB_PASSWORD'),
    database="sample_flix"
)
cursor = conn.cursor()

def insert_data(table, columns, values):
    if not values:
        return
    placeholders = ", ".join(["%s"] * len(values[0]))
    query = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"
    cursor.executemany(query, values)

cursor.execute("SELECT tconst FROM titleBasics")
existing_movies = set(row[0] for row in cursor.fetchall())
cursor.execute("SELECT nconst FROM nameBasics")
existing_people = set(row[0] for row in cursor.fetchall())

def load_movies():
    with open("raw_datasets/title.basics.tsv", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        data = []
        for i, row in enumerate(reader):
            if i >= MAX_ROWS: break
            data.append((
                row["tconst"], row["titleType"], row["primaryTitle"], row["originalTitle"],
                row["isAdult"] == "1",
                int(row["startYear"]) if row["startYear"].isdigit() else None,
                int(row["endYear"]) if row["endYear"].isdigit() else None,
                int(row["runtimeMinutes"]) if row["runtimeMinutes"].isdigit() else None,
                row["genres"]
            ))
    insert_data("titleBasics", ["tconst", "titleType", "primaryTitle", "originalTitle", "isAdult", "startYear", "endYear", "runtimeMinutes", "genres"], data)

    # refresh movie cache
    cursor.execute("SELECT tconst FROM titleBasics")
    global existing_movies
    existing_movies = set(row[0] for row in cursor.fetchall())

def load_people():
    with open("raw_datasets/name.basics.tsv", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        data = []
        for i, row in enumerate(reader):
            if i >= MAX_ROWS: break
            data.append((
                row["nconst"], row["primaryName"],
                int(row["birthYear"]) if row["birthYear"].isdigit() else None,
                int(row["deathYear"]) if row["deathYear"].isdigit() else None,
                row["primaryProfession"], row["knownForTitles"]
            ))
    insert_data("nameBasics", ["nconst", "primaryName", "birthYear", "deathYear", "primaryProfession", "knownForTitles"], data)

    # refresh people cache
    cursor.execute("SELECT nconst FROM nameBasics")
    global existing_people
    existing_people = set(row[0] for row in cursor.fetchall())

def load_ratings():
    with open("raw_datasets/title.ratings.tsv", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        data = []
        for i, row in enumerate(reader):
            if i >= MAX_ROWS: break
            if row["tconst"] in existing_movies:
                data.append((row["tconst"], float(row["averageRating"]), int(row["numVotes"])))
    insert_data("titleRatings", ["tconst", "averageRating", "numVotes"], data)

def load_crew():
    with open("raw_datasets/title.crew.tsv", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        data = []
        for i, row in enumerate(reader):
            if i >= MAX_ROWS: break
            movie_id = row["tconst"]
            if movie_id not in existing_movies:
                continue
            if row["directors"] != "\\N":
                data.append((movie_id, row["directors"], row["writers"]))
    insert_data("titleCrew", ["tconst", "directors", "writers"], data)

def load_principals():
    with open("raw_datasets/title.principals.tsv", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        data = []
        for i, row in enumerate(reader):
            if i >= MAX_ROWS: break
            if row["tconst"] in existing_movies and row["nconst"] in existing_people:
                data.append((row["tconst"], int(row["ordering"]), row["nconst"], row["category"], row["job"], row["characters"]))
    insert_data("titlePrincipals", ["tconst", "ordering", "nconst", "category", "job", "characters"], data)

def load_akas():
    with open("raw_datasets/title.akas.tsv", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        data = []
        for i, row in enumerate(reader):
            if i >= MAX_ROWS: break
            if row["titleId"] in existing_movies:
                data.append((row["titleId"], int(row["ordering"]), row["title"], row["region"], row["language"], row["types"], row["attributes"], row["isOriginalTitle"] == "1"))
    insert_data("titleAkas", ["titleId", "ordering", "title", "region", "language", "types", "attributes", "isOriginalTitle"], data)

def load_episodes():
    with open("raw_datasets/title.episode.tsv", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        data = []
        for i, row in enumerate(reader):
            if i >= MAX_ROWS: break
            if row["tconst"] in existing_movies and row["parentTconst"] in existing_movies:
                data.append((row["tconst"], row["parentTconst"],
                             int(row["seasonNumber"]) if row["seasonNumber"].isdigit() else None,
                             int(row["episodeNumber"]) if row["episodeNumber"].isdigit() else None))
    insert_data("titleEpisode", ["tconst", "parentTconst", "seasonNumber", "episodeNumber"], data)

# load data in order of dependencies to obey foreign key constraints
load_movies()
load_people()
load_ratings()
load_crew()
load_principals()
load_akas()
load_episodes()

conn.commit()
cursor.close()
conn.close()