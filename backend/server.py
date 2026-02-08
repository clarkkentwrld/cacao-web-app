import psutil
import sqlite3
import datetime
import os
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
# Enable CORS for all domains so your frontend (on a different port) can access this
CORS(app) 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'cacao_database.db')

# --- DATABASE SETUP ---

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    
    # --- RASPBERRY PI OPTIMIZATIONS ---
    # Enable Write-Ahead Logging (WAL) for concurrency and SD card health
    conn.execute("PRAGMA journal_mode=WAL;")
    # Reduce sync frequency to be gentler on the SD card
    conn.execute("PRAGMA synchronous=NORMAL;") 
    # ----------------------------------
    
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
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

# Initialize DB on startup
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

# --- HARDWARE MONITORING ---

def get_cpu_temp():
    """Reads the Raspberry Pi 5 CPU temperature."""
    try:
        # Standard path for RPi thermal sensor
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            temp = float(f.read()) / 1000.0
            return round(temp, 1)
    except Exception:
        return 0.0

@app.route('/api/system_status', methods=['GET'])
def get_system_status():
    """Returns detailed RPi hardware usage stats (Values + Percentages)."""
    
    # Memory Details
    mem = psutil.virtual_memory()
    mem_used_gb = round(mem.used / (1024 ** 3), 1)
    mem_total_gb = round(mem.total / (1024 ** 3), 1)

    # Storage Details
    disk = psutil.disk_usage('/')
    disk_used_gb = round(disk.used / (1024 ** 3), 1)
    disk_total_gb = round(disk.total / (1024 ** 3), 1)

    status = {
        "cpu": {
            "percent": psutil.cpu_percent(interval=None),
            "temp": get_cpu_temp()
        },
        "memory": {
            "percent": mem.percent,
            "used": mem_used_gb,
            "total": mem_total_gb
        },
        "storage": {
            "percent": disk.percent,
            "used": disk_used_gb,
            "total": disk_total_gb
        }
    }
    return jsonify(status)

# --- BATCH ENDPOINTS ---

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
    # RUNNING ON PORT 5002 (To avoid conflict with Camera on 5001 and Frontend on 5000/5173)
    app.run(debug=True, port=5002, host='0.0.0.0')