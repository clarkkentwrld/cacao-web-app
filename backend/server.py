import psutil
import sqlite3
import datetime
import os
import json
import time
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'cacao_database.db')
STATE_FILE = os.path.join(BASE_DIR, 'state.json')

# --- DATABASE SETUP ---
def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=10) # Added timeout
    conn.execute("PRAGMA journal_mode=WAL;") # crucial for concurrent access
    conn.row_factory = sqlite3.Row
    return conn

# --- STATE MANAGEMENT (The "Shared Brain") ---
def get_state():
    # If state file doesn't exist, create default
    if not os.path.exists(STATE_FILE):
        default_state = {"is_sorting": False, "batch_id": 1}
        with open(STATE_FILE, 'w') as f: json.dump(default_state, f)
        return default_state
    
    try:
        with open(STATE_FILE, 'r') as f: return json.load(f)
    except:
        return {"is_sorting": False, "batch_id": 1}

def update_state(key, value):
    state = get_state()
    state[key] = value
    with open(STATE_FILE, 'w') as f: json.dump(state, f)

# --- API ENDPOINTS ---

@app.route('/api/system_status', methods=['GET'])
def get_system_status():
    # 1. Hardware Stats
    cpu_p = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # 2. Logic State
    state = get_state()
    
    # 3. Database Counts (Live from DB)
    conn = get_db_connection()
    batch = conn.execute("SELECT * FROM batches WHERE id=?", (state['batch_id'],)).fetchone()
    conn.close()

    batch_data = dict(batch) if batch else {"total": 0, "small": 0, "medium": 0, "large": 0}

    return jsonify({
        "cpu": { "percent": cpu_p, "temp": 0 }, # (Add your temp function back if needed)
        "memory": { "percent": mem.percent },
        "storage": { "percent": disk.percent },
        "status": state,
        "counts": batch_data
    })

@app.route('/api/control', methods=['POST'])
def control_device():
    cmd = request.json.get('command')
    conn = get_db_connection()
    state = get_state()
    
    if cmd == 'TOGGLE':
        # Toggle 'is_sorting' in the shared file
        update_state('is_sorting', not state['is_sorting'])
        
    elif cmd == 'NEW_BATCH':
        # Create new batch in DB
        next_num = conn.execute("SELECT IFNULL(MAX(batch_number), 0) + 1 FROM batches").fetchone()[0]
        cur = conn.execute("INSERT INTO batches (batch_number) VALUES (?)", (next_num,))
        new_id = cur.lastrowid
        conn.commit()
        
        # Update shared state to point to new batch
        update_state('batch_id', new_id)
        update_state('is_sorting', False) # Reset to pause
        
    elif cmd == 'CONTINUE':
        # Find the most recent batch
        last = conn.execute("SELECT id FROM batches ORDER BY id DESC LIMIT 1").fetchone()
        if last:
            update_state('batch_id', last['id'])
            update_state('is_sorting', False) # Start paused
            
    conn.close()
    return jsonify({"success": True, "new_state": get_state()})

if __name__ == '__main__':
    app.run(debug=True, port=5002, host='0.0.0.0')