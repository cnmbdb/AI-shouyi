create table if not exists aether_blog_posts (
  id bigint unsigned not null auto_increment,
  slug varchar(180) not null,
  title varchar(255) not null,
  excerpt text not null,
  category varchar(64) not null,
  author_name varchar(120) not null,
  author_avatar varchar(500) null,
  image_url varchar(500) not null,
  image_position varchar(50) not null default '50% 50%',
  published_at date not null,
  read_time_minutes tinyint unsigned not null default 5,
  featured tinyint(1) not null default 0,
  editors_pick tinyint(1) not null default 0,
  published tinyint(1) not null default 1,
  display_order smallint unsigned not null default 0,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  primary key (id),
  unique key aether_blog_posts_slug_unique (slug),
  key aether_blog_posts_listing_idx (published, featured, editors_pick, display_order, published_at),
  key aether_blog_posts_category_idx (category, published)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists aether_newsletter_subscriptions (
  id bigint unsigned not null auto_increment,
  email varchar(254) not null,
  source varchar(32) not null default 'blog',
  created_at timestamp not null default current_timestamp,
  primary key (id),
  unique key aether_newsletter_email_unique (email)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

insert into aether_blog_posts
  (slug, title, excerpt, category, author_name, author_avatar, image_url, image_position, published_at, read_time_minutes, featured, editors_pick, display_order)
values
  ('designing-for-dreamscapes', 'Designing for Dreamscapes: The Future of Luxury Living', 'Explore how visionary architecture, nature, and innovation are shaping the next era of extraordinary homes.', 'Architecture', 'Isabella M.', 'https://i.pravatar.cc/96?img=47', '/images/estate-luna-ridge.png', '50% 50%', '2024-05-06', 6, 1, 0, 1),
  ('cliffside-masterpieces', 'Cliffside Masterpieces: Harmony with Nature', 'How architects are crafting homes that blend seamlessly into the world''s most breathtaking landscapes.', 'Architecture', 'Isabella M.', 'https://i.pravatar.cc/96?img=47', '/images/estate-luna-ridge.png', '50% 50%', '2024-05-02', 5, 0, 0, 2),
  ('inside-serenity', 'Inside Serenity: Modern Interiors That Inspire', 'Discover interior design principles that turn spaces into sanctuaries of comfort and timeless elegance.', 'Interiors', 'Sophia L.', 'https://i.pravatar.cc/96?img=32', '/images/retreat-pool.png', '50% 50%', '2024-04-28', 4, 0, 0, 3),
  ('art-of-slow-luxury-living', 'The Art of Slow Luxury Living', 'Embracing intentional living, wellness, and the beauty of everyday moments in extraordinary settings.', 'Lifestyle', 'Julian R.', 'https://i.pravatar.cc/96?img=12', '/images/estate-palm-serenity.png', '50% 50%', '2024-04-25', 6, 0, 0, 4),
  ('global-luxury-market-outlook-2024', 'Global Luxury Market Outlook 2024', 'Key trends, emerging destinations, and what''s shaping the future of high-end real estate worldwide.', 'Market Insights', 'Aether Lane', null, '/images/estate-vista-mare.png', '50% 50%', '2024-04-22', 7, 0, 0, 5),
  ('coastal-escapes', 'Coastal Escapes: The World''s Most Stunning Luxury Retreats', 'A curated tour of secluded shores, private coves, and remarkable homes at the water''s edge.', 'Travel', 'Aether Lane', null, '/images/estate-coast.png', '50% 50%', '2024-04-20', 6, 0, 1, 6),
  ('sustainability-in-luxury-design', 'Sustainability in Luxury Design: Building a Better Future', 'Materials, energy and landscape choices that make exceptional residences more responsible.', 'Architecture', 'Isabella M.', 'https://i.pravatar.cc/96?img=47', '/images/estate-vista-mare.png', '45% 50%', '2024-04-18', 5, 0, 1, 7),
  ('lighting-the-mood', 'Lighting the Mood: Creating Atmosphere with Light and Space', 'How layered light transforms materials, proportions and emotion throughout the home.', 'Interiors', 'Sophia L.', 'https://i.pravatar.cc/96?img=32', '/images/retreat-pool.png', '55% 50%', '2024-04-15', 4, 0, 1, 8)
on duplicate key update
  title = values(title),
  excerpt = values(excerpt),
  category = values(category),
  author_name = values(author_name),
  author_avatar = values(author_avatar),
  image_url = values(image_url),
  image_position = values(image_position),
  published_at = values(published_at),
  read_time_minutes = values(read_time_minutes),
  featured = values(featured),
  editors_pick = values(editors_pick),
  published = 1,
  display_order = values(display_order);

