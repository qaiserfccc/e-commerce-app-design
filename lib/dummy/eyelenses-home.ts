// Static storefront content retained for layout parity.
// Replace each export with backend data when the storefront is linked to the database.
const U = 'https://eyelenses.pk/wp-content/uploads'

export const dummyContact = {
  phone: '(+92) 301 574 0405',
  email: 'info@isklenses.com',
  address: 'Plot No. 169, A-4, Gul Manzil, G.H.Q Road, Garden West, Karachi.',
  facebook: 'https://web.facebook.com/ISKContactLenses',
  instagram: 'https://instagram.com/isk_contact_lenses',
}

export const dummyAnnouncements = [
  'Get exclusive discounts on top lens brands',
  'Delivery available all over Pakistan',
  'Hurry up and save now!',
  'Free delivery on orders over Rs 2500',
]

export const dummyBanners = [
  { href: '/shop', src: `${U}/2026/10/newEyelenses-scaled.webp`, alt: '10.10 sale' },
  { href: '/product-category/optiano', src: `${U}/2026/09/Sunglasses-Banner.webp`, alt: 'Sunglasses collection' },
  { href: '/shop', src: `${U}/2026/01/Shop-Now.webp`, alt: 'Shop now' },
  { href: '/shop', src: `${U}/2025/09/5-copy.webp`, alt: 'Deals on contact lenses' },
]

export const dummyPromoTiles = [
  { href: '/product-category/transparent-lenses', src: `${U}/2025/09/3-copy.webp`, alt: 'Transparent lenses' },
  { href: '/product-category/colored-lenses', src: `${U}/2025/09/2-copy.webp`, alt: 'Colored lenses' },
]

export interface DummyProduct {
  slug: string
  name: string
  image: string
  dia: string
  modality: string
  price: number
  salePrice: number
}

const p = (slug: string, name: string, image: string, dia: string, modality: string, price: number, salePrice: number): DummyProduct => ({ slug, name, image, dia, modality, price, salePrice })

export const dummyTrending: DummyProduct[] = [
  p('almond-brown-premium-collection-nayab', 'Almond Brown Premium Collection – Nayab', `${U}/2026/04/Almond-Brown-01.webp`, '14.2', '6 M', 4000, 2500),
  p('hazel-honey-premium-collection-nayab', 'Hazel Honey Premium Collection – Nayab', `${U}/2026/04/Hazel-Honey-01.webp`, '14.2', '6 M', 4000, 2500),
  p('platinum-gray-premium-collection-nayab', 'Platinum Gray Premium Collection – Nayab', `${U}/2026/04/Platinum-Gray-01.webp`, '14.2', '6 M', 4000, 2500),
  p('almond-brown-one-day-collection-bella', 'Almond Brown One Day Collection – Bella', `${U}/2025/01/Bella-One-Day-Collection-WebP-02.webp`, '14.2', '1 D', 2200, 1980),
  p('pine-one-day-collection-bella', 'Pine One Day Collection – Bella', `${U}/2025/01/OnedayPine.webp`, '14.2', '1 D', 2200, 1980),
  p('rosewood-one-day-collection-bella', 'Rosewood One Day Collection – Bella', `${U}/2025/01/rosewood.webp`, '14.2', '1 D', 2200, 1980),
  p('amber-gray-glamorous-collection-optiano', 'Amber Gray Glamorous Collection – Optiano', `${U}/2025/01/Optiano-Glamorous-WebP-02.webp`, '14.2', '6 M', 4300, 3900),
  p('emerald-green-glamorous-collection-optiano', 'Emerald Green Glamorous Collection – Optiano', `${U}/2025/01/Optiano-Glamorous-WebP-03.webp`, '14.5', '6 M', 4300, 3900),
  p('pure-hazel-luxurious-collection-optiano', 'Pure Hazel Luxurious Collection – Optiano', `${U}/2024/10/Optiano-Luxurious-Collection-WebP-10.webp`, '14.5', '6 M', 3800, 3400),
  p('sea-green-glamorous-collection-optiano', 'Sea Green Glamorous Collection – Optiano', `${U}/2025/01/Optiano-Glamorous-WebP-07.webp`, '14.2', '6 M', 4300, 3900),
  p('hazel-beige-one-day-collection-bella', 'Hazel Beige One Day Collection – Bella', `${U}/2025/01/Bella-One-Day-Collection-WebP-05.webp`, '14.2', '1 D', 2200, 1980),
]

export const dummyBrandLogos = [
  { name: 'Bella', href: '/product-category/bella', src: `${U}/2024/12/Group-52-1-1.webp` },
  { name: 'Freshlook', href: '/product-category/freshlook', src: `${U}/2024/12/Group-50-3-1-1.webp` },
  { name: 'US Vision', href: '/product-category/us-vision', src: `${U}/2024/12/Group-53-1.webp` },
  { name: 'Optiano', href: '/product-category/optiano', src: `${U}/2024/12/Group-51-1-1.webp` },
  { name: 'Freshkon', href: '/product-category/freshkon', src: `${U}/2025/09/Group-51-1-1.webp` },
  { name: 'Luminous', href: '/product-category/luminous', src: `${U}/2024/12/Group-55-1.webp` },
]

export const dummyWhyChoose = {
  eyebrow: 'Why Choose ISK Lenses?',
  heading: 'Your 1st Online Destination for Eye Lenses in Pakistan',
  lines: ['Explore a Wide Range of Stylish Eye Lenses', 'Quality Lenses Delivered to Your Doorstep'],
  items: [
    { title: 'Premium Quality Lenses', src: `${U}/2024/09/contact-lens.webp` },
    { title: 'Affordable Prices Lenses', src: `${U}/2024/09/saving-money.webp` },
    { title: 'Wide Range of Options', src: `${U}/2024/09/answer.webp` },
    { title: 'Safe & Secure Shopping', src: `${U}/2024/09/online-shopping-1.webp` },
  ],
}

export const dummyCategories = {
  heading: 'Categories',
  intro: 'Browse through our extensive selection to find the perfect lens for you.',
  items: [
    { href: '/product-category/colored-lenses', src: `${U}/2025/01/2-3.webp`, alt: 'Colored lenses' },
    { href: '/product-category/transparent-lenses', src: `${U}/2025/01/1-2.webp`, alt: 'Transparent lenses' },
    { href: '/product-category/accessories', src: `${U}/2025/01/3-3.webp`, alt: 'Accessories' },
  ],
}

export const dummyService = {
  title: 'Professional Service',
  body: 'Enjoy fast and secure delivery across Pakistan your lenses, delivered safely to your doorstep!',
  images: [`${U}/2024/09/Untitled-1-copy-5.webp`, `${U}/2024/09/tr_vi_2-Converted-02-1.webp`, `${U}/2024/09/Group-49-1.webp`],
}

export const dummyReviews = {
  heading: 'Customer Love Us',
  intro: 'Loved by customers for exceptional service and quality.',
  items: [
    { name: 'Ali Khan', text: 'I am truly impressed by the excellent customer service and timely delivery of my contact lenses. The quality of the lenses is outstanding!' },
    { name: 'Fatima Noor', text: 'The customer service was exceptional, and my order for lenses arrived right on time. I am very satisfied with the high quality Lenses!' },
    { name: 'Sara Ahmed', text: 'I had a great experience, I received regarding my eye lenses, and the delivery was punctual. The quality of the lenses exceeded my expectations!' },
  ],
}

export const dummySeo = {
  title: 'EyeLenses – Exceptional Eyelens Experience for Everyone',
  sections: [
    { heading: 'Experience the Ultimate Eye Comfort with Eye Lenses', paragraphs: ['Your eyes really are the most lovable part of your face, and that’s why you only get the best at Eye Lenses — the most reliable online outlet for premium contact lenses in Pakistan. Plus, our contact lenses price range is designed to stay affordable while still giving you top-quality comfort and style. Whether you need vision correction, color addition, or ultimate comfort throughout the day, there is a lens for every need. At Eye Lenses, a blend of clear, chic, and safe lenses is used to keep your eyes lively and fresh wherever life leads you.'] },
    { heading: 'About ISK Lenses', paragraphs: ['Eye Lenses is a main online dispensary of contact lenses that serves all categories of users, ranging from occasional wearers to daily lens users. We have a very broad selection of those lenses, including transparent, colored, and prescription lenses, all from world-renowned brands. We will not offer you any lens that is not extremely high in quality, comfort, and durability. At Eye Lenses, we know how much eye health matters to you; hence, we only select products that allow for maximum airflow and moisture retention. Our goal is to make premium eye care products available to the entire Pakistan with just a few clicks.'] },
    { heading: 'Why Choose Eye Lenses?', paragraphs: ['By choosing the best Eye Lenses Pakistan, you are choosing practicality, trustworthiness, and splendid quality. The lenses we sell do not just provide vision correction; we give you an entire eye care experience. On our platform, you can find different options, such as Transparent Lenses for a natural look and colored lenses for trying out different looks. At Eye Lenses, we hold the viewpoint that every individual’s eye is different and thus deserve a perfect pair of lenses. Hence, we provide an extensive selection of lenses that match every need and lifestyle at our store. Our assortment consists of Transparent Lenses, colored lenses, daily wear, monthly wear, and prescription lenses.', 'Moreover, we provide lenses with cutting-edge hydration technology that keep your eyes comfortable throughout the day. Whether it’s a party, a business meeting, or you just need sharper vision, our collection features some of the best eye lens brands in Pakistan that always deliver the comfort, style, and clarity you’re looking for. With our featured brands and quality guarantee, you can shop with confidence, knowing your eyesight is protected, and you’re getting the best value based on the current eye lens price in Pakistan.'] },
    { heading: 'Safe and Comfortable Eye Experience', paragraphs: ['To us, eye comfort and safety are the most important things. Eye Lenses, therefore, make lenses from the most advanced materials that permit natural O2 flow to the eyes, thus preventing the chances of dryness and irritation. Our transparent lenses and colored variants are very light, easily manageable, and can also be used by people with sensitive eyes.', 'The products must undergo rigorous quality assurance testing before they are made available to customers. If the right type of care and cleaning is provided, the lenses you receive from Eye Lenses will give you crystal-clear vision and comfort that lasts for hours throughout the day. For those comparing options and contact lenses price, Eye Lenses ensures premium comfort and safety at a fair value.'] },
    { heading: 'Easy Online Shopping at Eye Lenses Pakistan', paragraphs: ['Buying contact lenses can never get easier than this. At Eye Lenses, we have developed a process that is simple and secure. You can check out the different product categories, analyze the various features, and then place the order for your favorite Transparent Lenses or colored lenses, etc. Our website has been built to facilitate your shopping experience from selecting a product to the checkout stage.', 'So go ahead and place your order, as we will ensure fast delivery throughout Pakistan in safe and secure packages so that your lenses reach you quickly and in perfect condition. Best Eye Lenses Pakistan is dedicated to ensuring you not only see perfectly but also look great every day. We aim to provide top-notch lenses that match your vision requirements as well as your style.'] },
  ],
}

export const dummyNewArrivals = [
  { href: '/product-category/new-arrivals', src: `${U}/2024/12/New-Arrival-Banner-02-copy.webp`, alt: 'New arrivals' },
  { href: '/product-category/new-arrivals', src: `${U}/2025/01/New-Arrival-Banner-03-copy.webp`, alt: 'New arrivals' },
]

export const dummyFeatures = [
  { title: 'Free Delivery', body: 'Free delivery above Rs 2500.', src: `${U}/2025/12/free-delivery-400x400.webp` },
  { title: '7 Days Return', body: 'Easy returns within 7 days.', src: `${U}/2025/12/delivery-status-400x400.webp` },
  { title: '24/7 Support', body: '24/7 support for all your needs.', src: `${U}/2025/12/24-7-400x400.webp` },
  { title: 'Order Satisfaction', body: 'Your satisfaction is our priority.', src: `${U}/2024/09/iconseye-copy-1.webp` },
]

export const dummyFooter = {
  logo: `${U}/2026/01/400x180-copy.webp`,
  brands: ['Comfort', 'Bella', 'Optiano', 'Us Vision', 'Freshlook', 'Magic Eye', 'Dress Your Eye', 'Joli', 'Freshkon'],
  collections: ['Luminous', 'Naturel', '3D Colors', 'Tinker Bell'],
  explore: [
    ['Shop By Color', 'colored-lenses'], ['Shop By Diameter', 'shop-by-diameter-dia'], ['Shop By Disposibility', 'shop-by-disposability'],
    ['Deals', 'deals'], ['Accessories', 'accessories'], ['Transparent', 'transparent-lenses'],
  ],
  information: [
    ['Contact Us', '/contact-us'], ['Faq\'s', '/faq'], ['Blogs', '/blogs'], ['Privacy Policy', '/privacy-policy'],
    ['Shipping & Returns', '/shipping-returns'], ['Terms & Conditions', '/terms-conditions'],
  ],
  about: 'Eye Lenses is a main online dispensary of contact lenses that serves all categories of users, ranging from occasional wearers to daily lens users.',
}

export const dummyNavBrands = [
  'Comfort', 'Bella', 'Optiano', 'Us Vision', 'Freshlook', 'Magic Eye', 'Dress Your Eye', 'Freshkon', 'Venicol', 'Nayab',
]
