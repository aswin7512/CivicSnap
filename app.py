import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from helper import get_db_connection, extract_gps, compress_image
import datetime

app = Flask(__name__)

# --- ENABLE CORS ---
# This allows external domains (like your frontend) to securely talk to this API
CORS(app)

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Staging folder for temporary storage during forensic checks
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# ---------------------------------------------------------
# API ENDPOINTS
# ---------------------------------------------------------

# 1. Health Check Endpoint
# Replaces your index.html. Used to verify the API is online.
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "Online",
        "version": "1.0",
        "message": "Complaint API Backend is running."
    }), 200

# 2. Main Upload Endpoint (Versioned and restricted to POST)
@app.route('/api/v1/report', methods=['POST'])
def report_issue():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    file = request.files['image']
    category = request.form.get('category', 'No category')
    desc = request.form.get('description', 'No description')
    phone = request.form.get('phone')
    
    # Save temporarily for forensics
    temp_file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(temp_file_path)

    # --- STEP 1: FORENSIC VERIFICATION (Authenticity Gap) ---
    gps_data = extract_gps(temp_file_path)
    if not gps_data:
        os.remove(temp_file_path) # Delete fake image
        return jsonify({"status": "Rejected", "reason": "Image lacks GPS metadata"}), 400
    
    lat, lon = gps_data
    print(f"Forensics Passed. GPS: {lat}, {lon}")

    conn = get_db_connection()
    cur = conn.cursor()

    # --- STEP 2: REDUNDANCY CHECK (Radius Gap) ---
    check_query = """
        SELECT id, category FROM complaints 
        WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326), 20)
        AND status != 'Resolved';
    """
    cur.execute(check_query, (lon, lat))
    duplicate, data = False, cur.fetchall()
    
    for issue in data:
        if issue[1] == category:
            duplicate = True
            break

    if duplicate:
        cur.close()
        conn.close()
        os.remove(temp_file_path) # Clean up staging file
        # 409 Conflict is the standard status code for duplicate entries
        return jsonify({"status": "Duplicate", "message": "This issue has already been reported nearby."}), 409

    # --- STEP 3: SPATIAL ROUTING (Routing Gap) ---
    routing_query = """
        SELECT id, name FROM wards 
        WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326));
    """
    cur.execute(routing_query, (lon, lat))
    ward = cur.fetchone()
    
    ward_id = ward[0] if ward else None
    ward_name = ward[1] if ward else "Unknown Area"

    # --- STEP 4: PREPARE AND UPLOAD COMPRESSED IMAGE ---
    compression_success = compress_image(temp_file_path, quality=80)
    
    if not compression_success:
        print("Compression failed, uploading original uncompressed file.")

    # 2. Create a unique filename for the bucket
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"

    # 3. Upload to Supabase Storage
    try:
        with open(temp_file_path, 'rb') as f:
            supabase.storage.from_(SUPABASE_BUCKET).upload(
                path=unique_filename,
                file=f,
                file_options={"content-type": file.mimetype}
            )
        
        # Get the public URL to store in the database
        public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(unique_filename)
        
    except Exception as e:
        cur.close()
        conn.close()
        os.remove(temp_file_path)
        # 500 Internal Server Error for storage failure
        return jsonify({"error": f"Failed to upload to cloud storage: {str(e)}"}), 500

    # Clean up the local temporary file
    os.remove(temp_file_path)

    # --- STEP 5: SAVE TO DATABASE ---
    insert_query = """
        INSERT INTO complaints (image_url, description, geom, ward_id, category, phone_number)
        VALUES (%s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s)
        RETURNING id;
    """
    cur.execute(insert_query, (public_url, desc, lon, lat, ward_id, category, phone))
    new_id = cur.fetchone()[0]
    conn.commit()
    
    cur.close()
    conn.close()

    # 201 Created is the standard status code for successful record creation
    return jsonify({
        "status": "Success", 
        "complaint_id": new_id,
        "routed_to_ward": ward_name,
        "forensics": "Verified",
        "compression": "Applied" if compression_success else "Failed/Not Applied",
        "image_url": public_url
    }), 201

# 3. Issue Request End point
@app.route('/api/v1/complaints/user/<string:phone_number>', methods=['GET'])
def get_user_complaints(phone_number):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        query = """
            SELECT id, description, status, image_url, created_at, 
                   ST_Y(geom) as lat, ST_X(geom) as lon
            FROM complaints 
            WHERE phone_number = %s
            ORDER BY created_at DESC;
        """
        cur.execute(query, (phone_number,))
        records = cur.fetchall()

        complaints = []
        for row in records:
            # Handle the datetime to ISO string conversion safely
            db_date = row[4]
            if isinstance(db_date, datetime.datetime):
                # Convert to standard ISO format with 'Z' indicating UTC
                iso_date = db_date.isoformat()
                if not iso_date.endswith('Z') and not '+' in iso_date:
                    iso_date += 'Z'
            else:
                iso_date = None

            # Handle status casing (defaulting to 'pending' if null)
            raw_status = row[2]
            status_val = raw_status.lower() if raw_status else 'pending'

            # Build the exact dictionary the frontend expects
            complaints.append({
                "id": str(row[0]),           # Cast integer ID to string
                "description": row[1],
                "status": status_val,        # Lowercase status
                "image_url": row[3],
                "created_at": iso_date,      # ISO 8601 formatted date string
                "latitude": row[5],          # Float from PostGIS ST_Y
                "longitude": row[6]          # Float from PostGIS ST_X
            })
        print(complaints)

        # Return the raw array directly if your frontend maps over the root response
        return jsonify(complaints), 200

    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)