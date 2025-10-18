-- Add missing values to booking_status enum
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'received';

-- Add missing values to listing_status enum  
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'claimed';

-- Add missing values to food_category enum
ALTER TYPE food_category ADD VALUE IF NOT EXISTS 'vegetables';
ALTER TYPE food_category ADD VALUE IF NOT EXISTS 'fruits';
ALTER TYPE food_category ADD VALUE IF NOT EXISTS 'grains';
ALTER TYPE food_category ADD VALUE IF NOT EXISTS 'meat';
ALTER TYPE food_category ADD VALUE IF NOT EXISTS 'prepared_food';