-- 1. Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create Wards Table
CREATE TABLE wards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    geom GEOMETRY(Polygon, 4326)
);

-- 3. Create Complaints Table
CREATE TABLE complaints (
    id SERIAL PRIMARY KEY,
    image_path TEXT,
    description TEXT,
    status VARCHAR(20) DEFAULT 'Pending',
    geom GEOMETRY(Point, 4326),
    ward_id INTEGER REFERENCES wards(id)
);

-- 4. Insert dummy ward
INSERT INTO wards (name, geom) VALUES (
 'Test Ward 01', 
 ST_GeomFromText('POLYGON((76.0 9.0, 77.0 9.0, 77.0 10.0, 76.0 10.0, 76.0 9.0))', 4326)
);