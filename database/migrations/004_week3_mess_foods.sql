-- ============================================
-- 004: Week 3 — more IITR mess dishes in food_items
-- Optional: the backend already merges backend/app/data/mess_foods.json,
-- but seeding them here gives logged meals a real food_id link.
-- Generated from mess_foods.json; safe to re-run.
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_food_items_name_unique ON public.food_items (lower(name));

INSERT INTO public.food_items (name, category, default_serving_unit, default_grams,
  calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
  source, is_mess_specific)
VALUES
  ('Dal Makhani', 'dal', 'katori', 150, 140, 6, 14, 7, 4, 'custom', true),
  ('Dal Tadka', 'dal', 'katori', 150, 115, 6.5, 15, 3.5, 3, 'custom', true),
  ('Kadhi Pakora', 'dal', 'katori', 150, 110, 4, 10, 6, 1, 'custom', true),
  ('Chana Masala', 'dal', 'katori', 150, 150, 7.5, 19, 5, 5, 'custom', true),
  ('Soya Chunks Curry', 'vegetable', 'katori', 120, 145, 13, 11, 5.5, 4, 'custom', true),
  ('Aloo Matar', 'vegetable', 'katori', 120, 95, 3, 14, 3.5, 3, 'custom', true),
  ('Kadai Paneer', 'vegetable', 'katori', 120, 210, 11, 7, 15, 1.5, 'custom', true),
  ('Paneer Butter Masala', 'vegetable', 'katori', 120, 230, 10, 9, 17, 1, 'custom', true),
  ('Malai Kofta', 'vegetable', 'katori', 120, 210, 5, 14, 15, 1.5, 'custom', true),
  ('Veg Biryani', 'grain', 'plate', 250, 150, 3.5, 24, 4.5, 1.5, 'custom', true),
  ('Chicken Biryani', 'non_veg', 'plate', 300, 170, 9, 20, 6, 1, 'custom', true),
  ('Egg Bhurji', 'non_veg', 'katori', 100, 190, 12, 3, 14, 0.5, 'custom', true),
  ('Omelette', 'non_veg', 'piece', 70, 175, 11, 2, 13.5, 0.3, 'custom', true),
  ('Butter Chicken', 'non_veg', 'katori', 150, 190, 14, 6, 12, 0.5, 'custom', true),
  ('Aloo Paratha', 'grain', 'piece', 100, 250, 5.5, 35, 10, 3, 'custom', true),
  ('Chole Bhature', 'grain', 'plate', 250, 280, 7, 33, 13, 4, 'custom', true),
  ('Pav Bhaji', 'grain', 'plate', 250, 190, 4.5, 26, 8, 3, 'custom', true),
  ('Veg Fried Rice', 'grain', 'plate', 200, 165, 3.5, 26, 5.5, 1.2, 'custom', true),
  ('Veg Chowmein', 'grain', 'plate', 200, 160, 4, 24, 5.5, 1.5, 'custom', true),
  ('Pasta (Red Sauce)', 'grain', 'plate', 200, 150, 4.5, 25, 3.5, 1.8, 'custom', true),
  ('Curd Rice', 'grain', 'katori', 180, 120, 3, 20, 3, 0.4, 'custom', true),
  ('Lemon Rice', 'grain', 'katori', 180, 165, 3, 28, 4.5, 0.8, 'custom', true),
  ('Uttapam', 'grain', 'piece', 100, 160, 4, 26, 4, 1.2, 'custom', true),
  ('Medu Vada', 'snack', 'piece', 40, 290, 9, 30, 15, 3, 'custom', true),
  ('Samosa', 'snack', 'piece', 60, 310, 5, 32, 18, 2.5, 'custom', true),
  ('Pakora', 'snack', 'piece', 20, 300, 7, 28, 18, 3, 'custom', true),
  ('Bread Pakora', 'snack', 'piece', 70, 280, 6.5, 30, 15, 1.8, 'custom', true),
  ('Veg Manchurian', 'vegetable', 'katori', 120, 170, 4, 16, 10, 2, 'custom', true),
  ('Sprouts Salad', 'vegetable', 'katori', 100, 90, 7, 14, 0.8, 4, 'custom', true),
  ('Cornflakes with Milk', 'grain', 'katori', 200, 95, 3.5, 16, 2, 0.5, 'custom', true),
  ('Bread Butter', 'grain', 'slice', 35, 330, 7, 43, 14, 2.2, 'custom', true),
  ('Bread Jam', 'grain', 'slice', 40, 280, 6, 58, 3, 2, 'custom', true),
  ('Custard', 'sweet', 'katori', 120, 120, 3.5, 19, 3.5, 0, 'custom', true),
  ('Ice Cream', 'sweet', 'scoop', 60, 210, 3.5, 24, 11, 0.5, 'custom', true),
  ('Rasgulla', 'sweet', 'piece', 50, 186, 4, 40, 1.5, 0, 'custom', true),
  ('Besan Ladoo', 'sweet', 'piece', 40, 480, 9, 52, 26, 3, 'custom', true),
  ('Apple', 'fruit', 'piece', 150, 52, 0.3, 14, 0.2, 2.4, 'custom', true),
  ('Lassi (Sweet)', 'dairy', 'glass', 250, 90, 3, 14, 2.5, 0, 'custom', true),
  ('Paneer (Plain)', 'dairy', 'katori', 100, 265, 18, 1.2, 21, 0, 'custom', true),
  ('Green Chutney', 'condiment', 'tablespoon', 15, 40, 1.5, 6, 1, 2, 'custom', true)
ON CONFLICT (lower(name)) DO NOTHING;
