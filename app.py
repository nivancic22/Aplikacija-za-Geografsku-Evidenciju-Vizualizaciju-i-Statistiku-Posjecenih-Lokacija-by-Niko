from flask import Flask, render_template, jsonify, request
import psycopg2
import json
import os                       
from dotenv import load_dotenv   

load_dotenv()

app = Flask(__name__)

db_user = os.getenv("DB_USER", "postgres")       
db_pass = os.getenv("DB_PASSWORD", "test")
DB_CONFIG = f"dbname='gisdb' user='{db_user}' password='{db_pass}' host='localhost'"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/dodaj', methods=['POST'])
def dodaj_lokaciju():
    try:
        data = request.json
        conn = psycopg2.connect(DB_CONFIG)
        cur = conn.cursor()
        
        query = """
            INSERT INTO lokacije (naziv, kategorija, opis, geom)
            VALUES (%s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
        """
        cur.execute(query, (data['naziv'], data['kategorija'], data['opis'], data['lng'], data['lat']))
        conn.commit()
        conn.close()
        return jsonify({"status": "uspjeh"})
    except Exception as e:
        print(f"Greška kod spremanja: {e}")
        return jsonify({"status": "greška"}), 500

@app.route('/api/lokacije', methods=['GET'])
def dohvati_lokacije():
    try:
        conn = psycopg2.connect(DB_CONFIG)
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, naziv, kategorija, opis, ST_AsGeoJSON(geom) 
            FROM lokacije
        """)
        rows = cur.fetchall()
        
        rezultat = []
        for r in rows:
            rezultat.append({
                'naziv': r[1],
                'kategorija': r[2], 
                'opis': r[3],
                'geo': json.loads(r[4])
            })
        conn.close()
        return jsonify(rezultat)
    except Exception as e:
        print(f"Greška kod čitanja: {e}")
        return jsonify([])

@app.route('/api/statistika', methods=['GET'])
def statistika():
    try:
        conn = psycopg2.connect(DB_CONFIG)
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM lokacije")
        ukupno = cur.fetchone()[0]
        
        standardne = ['Grad', 'Priroda', 'Park', 'Muzej', 'Restoran', 'Znamenitost']
        
        cur.execute("SELECT kategorija, COUNT(*) FROM lokacije GROUP BY kategorija")
        sirovi_podaci = cur.fetchall()
        
        grupirano = {}
        broj_ostalo = 0
        
        for kat, broj in sirovi_podaci:
            if kat in standardne:
                grupirano[kat] = broj
            else:
                broj_ostalo += broj
        
        if broj_ostalo > 0:
            grupirano['Ostalo'] = broj_ostalo
        
        cur.execute("""
            SELECT ST_Length(ST_MakeLine(geom ORDER BY datum_posjeta)::geography) / 1000 
            FROM lokacije 
            WHERE geom IS NOT NULL;
        """)
        rezultat_km = cur.fetchone()
        kilometri = rezultat_km[0] if rezultat_km and rezultat_km[0] else 0
        
        conn.close()
        
        return jsonify({
            "ukupno": ukupno, 
            "detalji": grupirano,
            "km": round(kilometri, 2)
        })
    except Exception as e:
        print(f"Greška statistike: {e}")
        return jsonify({"ukupno": 0, "detalji": {}, "km": 0})

if __name__ == '__main__':
    app.run(debug=True)