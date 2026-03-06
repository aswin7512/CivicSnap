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
    image_url TEXT,
    category VARCHAR(50),
    description TEXT,
    status VARCHAR(20) DEFAULT 'Pending',
    geom GEOMETRY(Point, 4326),
    ward_id INTEGER REFERENCES wards(id),
    phone VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    upvotes INTEGER DEFAULT 0
);

-- 4. Insert dummy ward
INSERT INTO wards (name, geom) VALUES (
 'Test Ward 01', 
 ST_GeomFromText('POLYGON((76.0 9.0, 77.0 9.0, 77.0 10.0, 76.0 10.0, 76.0 9.0))', 4326)
);

-- 5. Create a supabase bucket to store the images
insert into storage.buckets (id, name, public)
values ('complaints', 'complaints', true);

-- 5. Allow anyone to view/download images from the 'complaints' bucket
CREATE POLICY "Public Read Access" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'complaints');

-- 6. Create the custom table in the public schema
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role VARCHAR(20) DEFAULT 'citizen' CHECK (role IN ('admin', 'citizen')),
    ward_allocated INTEGER REFERENCES public.wards(id)
);

-- 7. Trigger to add new users to profile table
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  assigned_role VARCHAR(20);
  assigned_ward INTEGER := NULL; -- Default to NULL for safety
BEGIN
  -- 1. Safely extract role. If missing or null, default to 'citizen'
  IF new.raw_user_meta_data IS NOT NULL AND new.raw_user_meta_data->>'role' IS NOT NULL THEN
    assigned_role := new.raw_user_meta_data->>'role';
  ELSE
    assigned_role := 'citizen';
  END IF;

  -- 2. Extract the ward ID only if the user is explicitly registering as an admin
  IF assigned_role = 'admin' THEN
    IF new.raw_user_meta_data->>'ward_allocated' IS NOT NULL THEN
      -- Cast the frontend data (which comes in as text) to a Postgres Integer
      assigned_ward := (new.raw_user_meta_data->>'ward_allocated')::INTEGER;
    END IF;
  END IF;

  -- 3. Insert into the public profiles table securely
  INSERT INTO public.profiles (id, role, ward_allocated)
  VALUES (new.id, assigned_role, assigned_ward);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();