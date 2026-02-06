from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import datetime
import os
import psutil  # Added for RPi 5 hardware monitoring

app = Flask(__name__)
CORS(app) 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'cacao_database.db')

# --- DATABASE LOGIC ---

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    
    # --- RASPBERRY PI OPTIMIZATIONS ---
    # Enable Write-Ahead Logging (WAL) for concurrency and SD card health
    conn.execute("PRAGMA journal_mode=WAL;")
    # Reduce sync frequency to be gentler on the SD card (safe in WAL mode)
    conn.execute("PRAGMA synchronous=NORMAL;") 
    # ----------------------------------

    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the SQLite database for cacao batches."""
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_number INTEGER NOT NULL, 
            total INTEGER DEFAULT 0,
            large INTEGER DEFAULT 0,
            medium INTEGER DEFAULT 0,
            small INTEGER DEFAULT 0,
            quality_good INTEGER DEFAULT 0,
            quality_bad INTEGER DEFAULT 0,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# Run initialization (creates DB and sets WAL mode if not already set)
init_db()

def get_next_batch_number():
    conn = get_db_connection()
    current_month = datetime.datetime.now().strftime('%Y-%m') 
    query = "SELECT COUNT(*) FROM batches WHERE strftime('%Y-%m', timestamp) = ?"
    try:
        count = conn.execute(query, (current_month,)).fetchone()[0]
    except:
        count = 0
    conn.close()
    return count + 1

# --- HARDWARE MONITORING LOGIC ---

def get_cpu_temp():
    """Reads the Raspberry Pi 5 CPU temperature."""
    try:
        # Standard path for RPi thermal sensor
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            temp = float(f.read()) / 1000.0
            return round(temp, 1)
    except Exception:
        return 0.0

# --- API ENDPOINTS ---

@app.route('/api/system_status', methods=['GET'])
def get_system_status():
    """Returns actual RPi 5 hardware usage stats."""
    status = {
        "cpu": psutil.cpu_percent(interval=None), # 'None' prevents blocking the Flask thread
        "memory": psutil.virtual_memory().percent,
        "storage": psutil.disk_usage('/').percent,
        "temperature": get_cpu_temp()
    }
    return jsonify(status)

@app.route('/api/batches', methods=['GET'])
def get_batches():
    conn = get_db_connection()
    batches = conn.execute('SELECT * FROM batches ORDER BY id DESC').fetchall()
    conn.close()
    return jsonify([dict(ix) for ix in batches])

@app.route('/api/batches', methods=['POST'])
def add_batch():
    data = request.json
    next_num = get_next_batch_number()
    
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO batches (batch_number, total, large, medium, small, quality_good, quality_bad)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        next_num, 
        data.get('total', 0),
        data.get('large', 0),
        data.get('medium', 0),
        data.get('small', 0),
        data.get('quality_good', 0),
        data.get('quality_bad', 0)
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "batch_number": next_num})

if __name__ == '__main__':
    # '0.0.0.0' allows your mobile app to connect via the Pi's IP address
    app.run(debug=True, port=5000, host='0.0.0.0')