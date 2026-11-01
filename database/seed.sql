-- ============================================
-- NUTRIMESS SEED DATA
-- ============================================

-- Seed 5 IIT Roorkee Bhawans with secretary hashes
INSERT INTO bhawans (name, code, description, secretary_hash) VALUES
  ('Vivekanand Bhawan', 'VB', 'Vivekanand Bhawan Mess', 'A3F1'),
  ('Rajiv Bhawan', 'RB', 'Rajiv Bhawan Mess', '8F42'),
  ('Govind Bhawan', 'GB', 'Govind Bhawan Mess', 'C7D9'),
  ('Jawahar Bhawan', 'JB', 'Jawahar Bhawan Mess', 'E2B6'),
  ('Himalaya Bhawan', 'HB', 'Himalaya Bhawan Mess', '5A0E');

-- ============================================
-- Seed common mess food items (IFCT 2017 based)
-- Per 100g nutritional values
-- ============================================
INSERT INTO food_items (name, name_hindi, category, default_serving_unit, default_grams,
  calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  fiber_per_100g, iron_per_100g, calcium_per_100g, source) VALUES
  -- Grains & Bread
  ('Jeera Rice', 'जीरा चावल', 'grain', 'katori', 180, 150, 2.7, 31.0, 1.5, 0.4, 0.7, 10, 'custom'),
  ('Plain Rice (Steamed)', 'सादा चावल', 'grain', 'katori', 180, 130, 2.7, 28.2, 0.3, 0.2, 0.2, 10, 'IFCT2017'),
  ('Chapati / Roti', 'चपाती / रोटी', 'grain', 'piece', 40, 240, 7.5, 50.0, 1.5, 3.5, 2.7, 25, 'IFCT2017'),
  ('Paratha (Plain)', 'पराठा', 'grain', 'piece', 60, 290, 6.5, 42.0, 11.0, 2.5, 2.3, 20, 'IFCT2017'),
  ('Puri', 'पूरी', 'grain', 'piece', 30, 350, 7.0, 48.0, 15.0, 2.0, 2.5, 18, 'IFCT2017'),
  ('Naan', 'नान', 'grain', 'piece', 80, 295, 8.0, 50.0, 6.5, 1.8, 2.0, 22, 'custom'),
  ('Poha', 'पोहा', 'grain', 'plate', 200, 110, 2.5, 20.0, 2.5, 0.8, 1.0, 8, 'IFCT2017'),
  ('Upma', 'उपमा', 'grain', 'plate', 200, 120, 3.5, 18.0, 4.0, 1.2, 0.8, 12, 'IFCT2017'),
  ('Bread Slice', 'ब्रेड', 'grain', 'slice', 30, 265, 8.0, 49.0, 3.5, 2.7, 2.5, 60, 'IFCT2017'),
  ('Idli', 'इडली', 'grain', 'piece', 40, 130, 3.2, 25.0, 0.5, 0.8, 0.5, 12, 'IFCT2017'),
  ('Dosa (Plain)', 'डोसा', 'grain', 'piece', 60, 168, 3.5, 28.0, 4.5, 0.6, 0.8, 15, 'IFCT2017'),

  -- Dals & Lentils
  ('Arhar / Toor Dal', 'अरहर दाल', 'dal', 'katori', 150, 110, 7.0, 15.0, 2.5, 3.0, 2.8, 55, 'IFCT2017'),
  ('Moong Dal', 'मूंग दाल', 'dal', 'katori', 150, 105, 7.5, 14.0, 2.0, 3.5, 3.0, 50, 'IFCT2017'),
  ('Chana Dal', 'चना दाल', 'dal', 'katori', 150, 120, 8.0, 16.0, 3.0, 4.0, 3.5, 60, 'IFCT2017'),
  ('Masoor Dal', 'मसूर दाल', 'dal', 'katori', 150, 108, 7.5, 15.5, 1.5, 3.2, 3.0, 40, 'IFCT2017'),
  ('Rajma (Kidney Beans)', 'राजमा', 'dal', 'katori', 150, 130, 8.5, 18.0, 2.5, 5.0, 4.0, 70, 'IFCT2017'),
  ('Chole (Chickpeas)', 'छोले', 'dal', 'katori', 150, 140, 7.5, 20.0, 4.0, 4.5, 3.5, 55, 'IFCT2017'),
  ('Sambhar', 'सांभर', 'dal', 'katori', 150, 65, 3.5, 8.0, 2.0, 2.5, 1.5, 30, 'IFCT2017'),

  -- Vegetables
  ('Aloo Sabzi (Potato)', 'आलू सब्जी', 'vegetable', 'katori', 120, 95, 2.0, 17.0, 3.0, 2.0, 0.5, 10, 'IFCT2017'),
  ('Aloo Gobi', 'आलू गोभी', 'vegetable', 'katori', 120, 85, 2.5, 12.0, 3.5, 2.5, 0.7, 25, 'custom'),
  ('Paneer Bhurji', 'पनीर भुर्जी', 'vegetable', 'katori', 120, 200, 14.0, 5.0, 14.0, 0.5, 0.3, 180, 'custom'),
  ('Shahi Paneer', 'शाही पनीर', 'vegetable', 'katori', 120, 220, 12.0, 8.0, 16.0, 0.8, 0.5, 200, 'custom'),
  ('Matar Paneer', 'मटर पनीर', 'vegetable', 'katori', 120, 180, 10.0, 8.0, 12.0, 2.0, 0.8, 160, 'custom'),
  ('Bhindi (Okra)', 'भिंडी', 'vegetable', 'katori', 120, 55, 2.0, 6.0, 2.5, 3.2, 0.6, 66, 'IFCT2017'),
  ('Baingan Bharta', 'बैंगन भर्ता', 'vegetable', 'katori', 120, 70, 2.0, 7.0, 4.0, 3.0, 0.5, 20, 'custom'),
  ('Lauki / Bottle Gourd', 'लौकी', 'vegetable', 'katori', 120, 30, 0.5, 5.0, 1.0, 1.5, 0.3, 15, 'IFCT2017'),
  ('Mix Veg', 'मिक्स सब्जी', 'vegetable', 'katori', 120, 80, 3.0, 10.0, 3.5, 3.0, 1.0, 40, 'custom'),
  ('Palak Paneer', 'पालक पनीर', 'vegetable', 'katori', 120, 170, 10.0, 6.0, 12.0, 2.5, 2.0, 180, 'custom'),
  ('Jeera Aloo', 'जीरा आलू', 'vegetable', 'katori', 120, 100, 2.0, 16.0, 4.0, 1.8, 0.5, 12, 'custom'),
  ('Seasonal Sabzi', 'मौसमी सब्जी', 'vegetable', 'katori', 120, 65, 2.0, 8.0, 3.0, 2.5, 0.8, 30, 'custom'),

  -- Non-Veg
  ('Egg Curry', 'अंडा करी', 'non_veg', 'piece', 80, 155, 12.0, 3.0, 11.0, 0.3, 1.5, 50, 'custom'),
  ('Boiled Egg', 'उबला अंडा', 'non_veg', 'piece', 55, 155, 13.0, 1.0, 11.0, 0.0, 1.2, 50, 'IFCT2017'),
  ('Chicken Curry', 'चिकन करी', 'non_veg', 'katori', 150, 150, 18.0, 5.0, 7.0, 0.5, 1.0, 15, 'custom'),
  ('Fish Curry', 'मछली करी', 'non_veg', 'piece', 120, 120, 16.0, 4.0, 5.0, 0.2, 1.2, 30, 'custom'),

  -- Dairy & Beverages
  ('Curd / Dahi', 'दही', 'dairy', 'katori', 100, 60, 3.5, 5.0, 3.0, 0.0, 0.1, 120, 'IFCT2017'),
  ('Raita', 'रायता', 'dairy', 'katori', 100, 55, 3.0, 5.0, 2.5, 0.5, 0.2, 110, 'custom'),
  ('Buttermilk / Chaas', 'छाछ', 'dairy', 'glass', 200, 30, 1.5, 3.0, 1.0, 0.0, 0.1, 60, 'IFCT2017'),
  ('Milk (Toned)', 'दूध', 'dairy', 'glass', 200, 58, 3.2, 4.7, 3.0, 0.0, 0.1, 120, 'IFCT2017'),
  ('Tea (with Milk & Sugar)', 'चाय', 'beverage', 'cup', 150, 35, 0.8, 5.0, 1.0, 0.0, 0.0, 20, 'custom'),
  ('Coffee (with Milk & Sugar)', 'कॉफी', 'beverage', 'cup', 150, 40, 1.0, 5.5, 1.2, 0.0, 0.0, 18, 'custom'),

  -- Sweets & Snacks
  ('Gulab Jamun', 'गुलाब जामुन', 'sweet', 'piece', 40, 325, 5.0, 45.0, 14.0, 0.3, 0.5, 50, 'custom'),
  ('Kheer / Rice Pudding', 'खीर', 'sweet', 'katori', 120, 150, 3.5, 22.0, 5.5, 0.2, 0.2, 90, 'custom'),
  ('Halwa (Suji)', 'हलवा', 'sweet', 'katori', 100, 280, 3.0, 35.0, 14.0, 0.5, 0.8, 20, 'custom'),
  ('Jalebi', 'जलेबी', 'sweet', 'piece', 30, 370, 2.0, 55.0, 16.0, 0.2, 0.5, 10, 'custom'),
  ('Fruit Salad', 'फ्रूट सलाद', 'fruit', 'katori', 120, 45, 0.5, 10.0, 0.2, 1.5, 0.3, 15, 'IFCT2017'),
  ('Banana', 'केला', 'fruit', 'piece', 120, 89, 1.1, 23.0, 0.3, 2.6, 0.3, 5, 'IFCT2017'),
  ('Papad (Roasted)', 'पापड़', 'snack', 'piece', 15, 310, 20.0, 48.0, 4.0, 4.5, 5.0, 60, 'IFCT2017'),
  ('Pickle (Achar)', 'अचार', 'condiment', 'teaspoon', 10, 150, 1.0, 8.0, 13.0, 1.0, 1.0, 15, 'custom'),
  ('Salad (Onion, Cucumber)', 'सलाद', 'vegetable', 'plate', 60, 20, 0.8, 4.0, 0.1, 1.0, 0.3, 20, 'custom');
