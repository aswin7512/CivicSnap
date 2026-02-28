import os
import uuid
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
import psycopg2
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from supabase import create_client, Client

app = Flask(__name__)

# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------
load_dotenv()
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

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
# HELPER 1: CONNECT TO DATABASE
# ---------------------------------------------------------
def get_db_connection():
    conn = psycopg2.connect(
        host=DB_HOST,
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
# HELPER: COMPRESS IMAGE
# ---------------------------------------------------------
def compress_image(image_path, quality=80):
    """
    Reads an image from disk, compresses it, and overwrites 
    the original file.
    """
    try:
        # Get the original file size for comparison
        original_size = os.path.getsize(image_path)
        
        img = Image.open(image_path)
        
        # Convert transparent images to RGB (JPEG requirement)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        # Determine format based on file extension
        # If normalizing everything to JPEG is desired, set format='JPEG' below.
        filename = os.path.basename(image_path)
        _, ext = os.path.splitext(filename)
        
        # PIL format names are uppercase (e.g., 'JPEG', 'PNG')
        img_format = ext.strip('.').upper()
        if img_format == 'JPG': img_format = 'JPEG'
        
        # --- KEY COMPRESSION STEP ---
        # Save back to the same path with reduced quality
        img.save(image_path, format=img_format, quality=quality, optimize=True)
        
        # Verify compression was successful
        new_size = os.path.getsize(image_path)
        
        # Print compression statistics to console
        reduction = original_size - new_size
        print(f"Compression Complete: Original: {original_size} bytes, Compressed: {new_size} bytes. Reduced by {reduction} bytes ({reduction/original_size*100:.2f}%)")

        return True
    
    except Exception as e:
        print(f"Compression Error: {e}")
        # Log error but return False so the app can continue if required
        return False

# ---------------------------------------------------------
# API: UPLOAD COMPLAINT
# ---------------------------------------------------------
@app.route('/report', methods=['POST', 'GET'])
def report_issue():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    file = request.files['image']
    category = request.form.get('category', 'No category')
    desc = request.form.get('description', 'No description')
    
    # Save temporarily for forensics
    temp_file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(temp_file_path)

    # --- STEP 1: FORENSIC VERIFICATION (Authenticity Gap) ---
    gps_data = extract_gps(temp_file_path)
    if not gps_data:
        os.remove(temp_file_path) # Delete fake image
        return jsonify({"status": "Rejected", "reason": "Image lacks GPS metadata (Forensic Check Failed)"}), 400
    
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
    print(duplicate)

    if duplicate:
        cur.close()
        conn.close()
        os.remove(temp_file_path) # Clean up staging file
        return jsonify({"status": "Duplicate", "message": "This issue has already been reported nearby."})

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
            # We must specify the correct mimetype (e.g., image/jpeg)
            # The original file.mimetype should still be valid even after compression
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
        return jsonify({"error": f"Failed to upload to cloud storage: {str(e)}"}), 500

    # Clean up the local temporary file now that it's safely in Supabase
    os.remove(temp_file_path)

    # --- STEP 5: SAVE TO DATABASE ---
    insert_query = """
        INSERT INTO complaints (image_url, description, geom, ward_id, category)
        VALUES (%s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s)
        RETURNING id;
    """
    cur.execute(insert_query, (public_url, desc, lon, lat, ward_id, category))
    new_id = cur.fetchone()[0]
    conn.commit()
    
    cur.close()
    conn.close()

    return jsonify({
        "status": "Success", 
        "complaint_id": new_id,
        "routed_to_ward": ward_name,
        "forensics": "Verified",
        "compression": "Applied" if compression_success else "Failed/Not Applied",
        "image_url": public_url
    })

@app.route('/')
def home():
    return render_template("index.html")

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')