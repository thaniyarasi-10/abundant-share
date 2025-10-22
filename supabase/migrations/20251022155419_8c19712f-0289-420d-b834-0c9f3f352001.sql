-- Fix 1: Add public_location column to hide exact donor addresses
ALTER TABLE public.food_listings 
ADD COLUMN public_location TEXT;

-- Create function to get full pickup location only for authorized users
CREATE OR REPLACE FUNCTION public.get_pickup_location(
  listing_id UUID,
  requesting_user_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  listing RECORD;
BEGIN
  -- Get the listing
  SELECT * INTO listing
  FROM food_listings
  WHERE id = listing_id;
  
  -- Return full address if user is the donor or has claimed the listing
  IF listing.donor_id = requesting_user_id OR 
     EXISTS (
       SELECT 1 FROM claims 
       WHERE listing_id = listing.id 
       AND claimed_by = requesting_user_id
     ) THEN
    RETURN listing.pickup_location;
  ELSE
    -- Return only public location for others
    RETURN listing.public_location;
  END IF;
END;
$$;

-- Fix 2: Create the food-images storage bucket (PRIVATE for security)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'food-images',
  'food-images', 
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
);

-- Create RLS policies for food-images bucket
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'food-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'food-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'food-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'food-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);