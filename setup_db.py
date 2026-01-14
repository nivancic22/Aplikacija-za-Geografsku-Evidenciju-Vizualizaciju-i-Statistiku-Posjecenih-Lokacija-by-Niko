import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

load_dotenv()

db_user = os.getenv("DB_USER", "postgres")
db_pass = os.getenv("DB_PASSWORD", "test")

def instaliraj_sustav():
    print(" 1. Spajam se na glavni server...")
    
    try:
        conn = psycopg2.connect(
            dbname='postgres', 
            user=db_user,      
            password=db_pass,  
            host='localhost'
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        print(" 2. Kreiram bazu 'gisdb'...")
        cur.execute("DROP DATABASE IF EXISTS gisdb;")
        cur.execute("CREATE DATABASE gisdb;")
        
        cur.close()
        conn.close()
        print("    Baza uspješno kreirana!")
        
        print(" 3. Konfiguriram PostGIS i tablice...")
        
        conn = psycopg2.connect(
            dbname='gisdb', 
            user=db_user,       
            password=db_pass,   
            host='localhost'
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS lokacije (
                id SERIAL PRIMARY KEY,
                naziv VARCHAR(100) NOT NULL,
                kategorija VARCHAR(50),
                opis TEXT,
                datum_posjeta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                geom GEOMETRY(Point, 4326)
            );
        """)
        
        print(" USPJEH! Sve je spremno. Sada pokreni 'python app.py'")
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"\n GREŠKA: {e}")
        print("Savjet: Provjeri je li .env datoteka ispravna i jesu li user/pass točni.")

if __name__ == "__main__":
    instaliraj_sustav()