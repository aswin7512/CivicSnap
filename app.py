import os
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
import psycopg2
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

app = Flask(__name__)

# CONFIGURATION
load_dotenv()
DB_USER = os.getenv("user")
DB_PASS = os.getenv("password")
DB_HOST = os.getenv("host")
DB_PORT = os.getenv("port")
DB_NAME = os.getenv("dbname")
UPLOAD_FOLDER = 'uploads'

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# ---------------------------------------------------------
# HELPER 1: CONNECT TO DATABASE
# ---------------------------------------------------------
def get_db_connection():
    conn = psycopg2.connect(host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        port=DB_PORT
    )
    return conn

# ---------------------------------------------------------
# HELPER 2: EXTRACT GPS FROM IMAGE (Forensic Logic)
# ---------------------------------------------------------
def get_decimal_from_dms(dms, ref):
    degrees = dms[0]
    minutes = dms[1]
    seconds = dms[2]
    decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
    if ref in ['S', 'W']:
        decimal = -decimal
    return decimal

def extract_gps(image_path):
    try:
        image = Image.open(image_path)
        exif_data = image._getexif()
        
        if not exif_data:
            return None # Reject: No Metadata

        gps_info = {}
        for tag, value in exif_data.items():
            tag_name = TAGS.get(tag, tag)
            if tag_name == "GPSInfo":
                for t, v in value.items():
                    sub_tag = GPSTAGS.get(t, t)
                    gps_info[sub_tag] = v
        
        # Convert to Decimal Lat/Lon
        if 'GPSLatitude' in gps_info and 'GPSLongitude' in gps_info:
            lat = get_decimal_from_dms(gps_info['GPSLatitude'], gps_info['GPSLatitudeRef'])
            lon = get_decimal_from_dms(gps_info['GPSLongitude'], gps_info['GPSLongitudeRef'])
            return lat, lon
        return None 

    except Exception as e:
        print(f"Forensic Error: {e}")
        return None

# ---------------------------------------------------------
# API: UPLOAD COMPLAINT
# ---------------------------------------------------------
@app.route('/report', methods=['POST', 'GET'])
def report_issue():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    file = request.files['image']
    desc = request.form.get('description', 'No description')
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    # --- STEP 1: FORENSIC VERIFICATION (Authenticity Gap) ---
    gps_data = extract_gps(file_path)
    if not gps_data:
        os.remove(file_path) # Delete fake image
        return jsonify({"status": "Rejected", "reason": "Image lacks GPS metadata (Forensic Check Failed)"}), 400
    
    lat, lon = gps_data
    print(f"Forensics Passed. GPS: {lat}, {lon}")

    conn = get_db_connection()
    cur = conn.cursor()

    # --- STEP 2: REDUNDANCY CHECK (Radius Gap) ---
    # Check if a complaint exists within 20 meters
    check_query = """
        SELECT id FROM complaints 
        WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326), 20)
        AND status != 'Resolved';
    """
    cur.execute(check_query, (lon, lat)) # Note: PostGIS uses (Lon, Lat) order
    duplicate = cur.fetchone()

    if duplicate:
        cur.close()
        conn.close()
        return jsonify({"status": "Duplicate", "message": "This issue has already been reported nearby."})

    # --- STEP 3: SPATIAL ROUTING (Routing Gap) ---
    # Find which ward polygon contains this point
    routing_query = """
        SELECT id, name FROM wards 
        WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326));
    """
    cur.execute(routing_query, (lon, lat))
    ward = cur.fetchone()
    
    ward_id = ward[0] if ward else None
    ward_name = ward[1] if ward else "Unknown Area"

    # --- STEP 4: SAVE TO DATABASE ---
    insert_query = """
        INSERT INTO complaints (image_path, description, geom, ward_id)
        VALUES (%s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s)
        RETURNING id;
    """
    cur.execute(insert_query, (file_path, desc, lon, lat, ward_id))
    new_id = cur.fetchone()[0]
    conn.commit()
    
    cur.close()
    conn.close()

    return jsonify({
        "status": "Success", 
        "complaint_id": new_id,
        "routed_to_ward": ward_name,
        "forensics": "Verified"
    })

@app.route('/')
def home():
    return render_template("index.html")

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')