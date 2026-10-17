-- Storefront content managed from the admin workspace. Image URLs point at
-- Vercel Blob (or any https URL) and are read by the storefront from this table.
CREATE TABLE IF NOT EXISTS public.store_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement text NOT NULL CHECK (placement IN ('hero', 'promo', 'brand', 'category', 'service', 'new_arrival', 'feature', 'why_choose')),
  title text NOT NULL DEFAULT '' CHECK (length(title) <= 200),
  body text CHECK (body IS NULL OR length(body) <= 500),
  image_url text NOT NULL CHECK (image_url ~ '^https://' AND length(image_url) <= 2000),
  blob_pathname text,
  href text CHECK (href IS NULL OR (href ~ '^(/|https://)' AND length(href) <= 500)),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_banners_placement_idx ON public.store_banners (placement, sort_order) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.store_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text NOT NULL CHECK (length(author) BETWEEN 1 AND 100),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_settings (
  key text PRIMARY KEY CHECK (key IN ('announcements', 'contact', 'headings', 'seo_sections', 'footer')),
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed content (editable from Admin > Storefront). Existing rows are never overwritten.
INSERT INTO public.store_banners (placement, title, body, image_url, href, sort_order)
SELECT v.* FROM (VALUES
  ('hero', '10.10 sale', NULL, 'https://eyelenses.pk/wp-content/uploads/2026/10/newEyelenses-scaled.webp', '/shop', 0),
  ('hero', 'Sunglasses collection', NULL, 'https://eyelenses.pk/wp-content/uploads/2026/09/Sunglasses-Banner.webp', '/product-category/optiano', 1),
  ('hero', 'Shop now', NULL, 'https://eyelenses.pk/wp-content/uploads/2026/01/Shop-Now.webp', '/shop', 2),
  ('hero', 'Deals on contact lenses', NULL, 'https://eyelenses.pk/wp-content/uploads/2025/09/5-copy.webp', '/shop', 3),
  ('promo', 'Transparent lenses', NULL, 'https://eyelenses.pk/wp-content/uploads/2025/09/3-copy.webp', '/product-category/transparent-lenses', 0),
  ('promo', 'Colored lenses', NULL, 'https://eyelenses.pk/wp-content/uploads/2025/09/2-copy.webp', '/product-category/colored-lenses', 1),
  ('brand', 'Bella', NULL, 'https://eyelenses.pk/wp-content/uploads/2024/12/Group-52-1-1.webp', '/product-category/bella', 0),
  ('brand', 'Freshlook', NULL, 'https://eyelenses.pk/wp-content/uploads/2024/12/Group-50-3-1-1.webp', '/product-category/freshlook', 1),
  ('brand', 'US Vision', NULL, 'https://eyelenses.pk/wp-content/uploads/2024/12/Group-53-1.webp', '/product-category/us-vision', 2),
  ('brand', 'Optiano', NULL, 'https://eyelenses.pk/wp-content/uploads/2024/12/Group-51-1-1.webp', '/product-category/optiano', 3),
  ('brand', 'Freshkon', NULL, 'https://eyelenses.pk/wp-content/uploads/2025/09/Group-51-1-1.webp', '/product-category/freshkon', 4),
  ('brand', 'Luminous', NULL, 'https://eyelenses.pk/wp-content/uploads/2024/12/Group-55-1.webp', '/product-category/luminous', 5),
  ('why_choose', 'Premium Quality Lenses', NULL, 'https://eyelenses.pk/wp-content/uploads/2024/09/contact-lens.webp', NULL, 0),
  ('why_choose', 'Affordable Prices Lenses', NULL, 'https://eyelenses.pk/wp-content/uploads/2024/09/saving-money.webp', NULL, 1),
  ('why_choose', 'Wide Range of Options', NULL, 'https://eyelenses.pk/wp-content/uploads/2024/09/answer.webp', NULL, 2),
  ('why_choose', 'Safe & Secure Shopping', NULL, 'https://eyelenses.pk/wp-content/uploads/2024/09/online-shopping-1.webp', NULL, 3),
  ('category', 'Colored lenses', NULL, 'https://eyelenses.pk/wp-content/uploads/2025/01/2-3.webp', '/product-category/colored-lenses', 0),
  ('category', 'Transparent lenses', NULL, 'https://eyelenses.pk/wp-content/uploads/2025/01/1-2.webp', '/product-category/transparent-lenses', 1),
  ('category', 'Accessories', NULL, 'https://eyelenses.pk/wp-content/uploads/2025/01/3-3.webp', '/product-category/accessories', 2),
  ('service', 'Service 1', NULL, 'https://eyelenses.pk/wp-content/uploads/2024/09/Untitled-1-copy-5.webp', NULL, 0),
  ('service', 'Service 2', NULL, 'https://eyelenses.pk/wp-content/uploads/2024/09/tr_vi_2-Converted-02-1.webp', NULL, 1),
  ('service', 'Service 3', NULL, 'https://eyelenses.pk/wp-content/uploads/2024/09/Group-49-1.webp', NULL, 2),
  ('new_arrival', 'New arrivals', NULL, 'https://eyelenses.pk/wp-content/uploads/2024/12/New-Arrival-Banner-02-copy.webp', '/product-category/new-arrivals', 0),
  ('new_arrival', 'New arrivals', NULL, 'https://eyelenses.pk/wp-content/uploads/2025/01/New-Arrival-Banner-03-copy.webp', '/product-category/new-arrivals', 1),
  ('feature', 'Free Delivery', 'Free delivery above Rs 2500.', 'https://eyelenses.pk/wp-content/uploads/2025/12/free-delivery-400x400.webp', NULL, 0),
  ('feature', '7 Days Return', 'Easy returns within 7 days.', 'https://eyelenses.pk/wp-content/uploads/2025/12/delivery-status-400x400.webp', NULL, 1),
  ('feature', '24/7 Support', '24/7 support for all your needs.', 'https://eyelenses.pk/wp-content/uploads/2025/12/24-7-400x400.webp', NULL, 2),
  ('feature', 'Order Satisfaction', 'Your satisfaction is our priority.', 'https://eyelenses.pk/wp-content/uploads/2024/09/iconseye-copy-1.webp', NULL, 3)
) AS v(placement, title, body, image_url, href, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.store_banners);

INSERT INTO public.store_reviews (author, body, sort_order)
SELECT v.* FROM (VALUES
  ('Ali Khan', 'I am truly impressed by the excellent customer service and timely delivery of my contact lenses. The quality of the lenses is outstanding!', 0),
  ('Fatima Noor', 'The customer service was exceptional, and my order for lenses arrived right on time. I am very satisfied with the high quality Lenses!', 1),
  ('Sara Ahmed', 'I had a great experience, I received regarding my eye lenses, and the delivery was punctual. The quality of the lenses exceeded my expectations!', 2)
) AS v(author, body, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.store_reviews);

INSERT INTO public.store_settings (key, value) VALUES
  ('announcements', '["Get exclusive discounts on top lens brands","Delivery available all over Pakistan","Hurry up and save now!","Free delivery on orders over Rs 2500"]'::jsonb),
  ('contact', '{"phone":"(+92) 301 574 0405","email":"info@isklenses.com","address":"Plot No. 169, A-4, Gul Manzil, G.H.Q Road, Garden West, Karachi.","facebook":"https://web.facebook.com/ISKContactLenses","instagram":"https://instagram.com/isk_contact_lenses"}'::jsonb),
  ('headings', '{"whyChoose":"Why Choose ISK Lenses?","whyChooseHeading":"Your 1st Online Destination for Eye Lenses in Pakistan","whyChooseLines":["Explore a Wide Range of Stylish Eye Lenses","Quality Lenses Delivered to Your Doorstep"],"categories":"Categories","categoriesIntro":"Browse through our extensive selection to find the perfect lens for you.","serviceTitle":"Professional Service","serviceBody":"Enjoy fast and secure delivery across Pakistan your lenses, delivered safely to your doorstep!","reviews":"Customer Love Us","reviewsIntro":"Loved by customers for exceptional service and quality.","seoTitle":"EyeLenses – Exceptional Eyelens Experience for Everyone"}'::jsonb),
  ('seo_sections', '[{"heading":"Experience the Ultimate Eye Comfort with Eye Lenses","paragraphs":["Your eyes really are the most lovable part of your face, and that’s why you only get the best at Eye Lenses — the most reliable online outlet for premium contact lenses in Pakistan. Plus, our contact lenses price range is designed to stay affordable while still giving you top-quality comfort and style. Whether you need vision correction, color addition, or ultimate comfort throughout the day, there is a lens for every need. At Eye Lenses, a blend of clear, chic, and safe lenses is used to keep your eyes lively and fresh wherever life leads you."]},{"heading":"About ISK Lenses","paragraphs":["Eye Lenses is a main online dispensary of contact lenses that serves all categories of users, ranging from occasional wearers to daily lens users. We have a very broad selection of those lenses, including transparent, colored, and prescription lenses, all from world-renowned brands. We will not offer you any lens that is not extremely high in quality, comfort, and durability. At Eye Lenses, we know how much eye health matters to you; hence, we only select products that allow for maximum airflow and moisture retention. Our goal is to make premium eye care products available to the entire Pakistan with just a few clicks."]},{"heading":"Why Choose Eye Lenses?","paragraphs":["By choosing the best Eye Lenses Pakistan, you are choosing practicality, trustworthiness, and splendid quality. The lenses we sell do not just provide vision correction; we give you an entire eye care experience. On our platform, you can find different options, such as Transparent Lenses for a natural look and colored lenses for trying out different looks. At Eye Lenses, we hold the viewpoint that every individual’s eye is different and thus deserve a perfect pair of lenses. Hence, we provide an extensive selection of lenses that match every need and lifestyle at our store. Our assortment consists of Transparent Lenses, colored lenses, daily wear, monthly wear, and prescription lenses.","Moreover, we provide lenses with cutting-edge hydration technology that keep your eyes comfortable throughout the day. Whether it’s a party, a business meeting, or you just need sharper vision, our collection features some of the best eye lens brands in Pakistan that always deliver the comfort, style, and clarity you’re looking for. With our featured brands and quality guarantee, you can shop with confidence, knowing your eyesight is protected, and you’re getting the best value based on the current eye lens price in Pakistan."]},{"heading":"Safe and Comfortable Eye Experience","paragraphs":["To us, eye comfort and safety are the most important things. Eye Lenses, therefore, make lenses from the most advanced materials that permit natural O2 flow to the eyes, thus preventing the chances of dryness and irritation. Our transparent lenses and colored variants are very light, easily manageable, and can also be used by people with sensitive eyes.","The products must undergo rigorous quality assurance testing before they are made available to customers. If the right type of care and cleaning is provided, the lenses you receive from Eye Lenses will give you crystal-clear vision and comfort that lasts for hours throughout the day. For those comparing options and contact lenses price, Eye Lenses ensures premium comfort and safety at a fair value."]},{"heading":"Easy Online Shopping at Eye Lenses Pakistan","paragraphs":["Buying contact lenses can never get easier than this. At Eye Lenses, we have developed a process that is simple and secure. You can check out the different product categories, analyze the various features, and then place the order for your favorite Transparent Lenses or colored lenses, etc. Our website has been built to facilitate your shopping experience from selecting a product to the checkout stage.","So go ahead and place your order, as we will ensure fast delivery throughout Pakistan in safe and secure packages so that your lenses reach you quickly and in perfect condition. Best Eye Lenses Pakistan is dedicated to ensuring you not only see perfectly but also look great every day. We aim to provide top-notch lenses that match your vision requirements as well as your style."]}]'::jsonb),
  ('footer', '{"logo":"https://eyelenses.pk/wp-content/uploads/2026/01/400x180-copy.webp","about":"Eye Lenses is a main online dispensary of contact lenses that serves all categories of users, ranging from occasional wearers to daily lens users.","brands":["Comfort","Bella","Optiano","Us Vision","Freshlook","Magic Eye","Dress Your Eye","Joli","Freshkon"],"collections":["Luminous","Naturel","3D Colors","Tinker Bell"],"explore":[["Shop By Color","colored-lenses"],["Shop By Diameter","shop-by-diameter-dia"],["Shop By Disposibility","shop-by-disposability"],["Deals","deals"],["Accessories","accessories"],["Transparent","transparent-lenses"]],"information":[["Contact Us","/contact-us"],["Faq''s","/faq"],["Blogs","/blogs"],["Privacy Policy","/privacy-policy"],["Shipping & Returns","/shipping-returns"],["Terms & Conditions","/terms-conditions"]]}'::jsonb)
ON CONFLICT (key) DO NOTHING;

