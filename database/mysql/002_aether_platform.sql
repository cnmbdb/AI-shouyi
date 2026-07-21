-- Aether Lane compute-platform authentication and site configuration.

create table if not exists aether_users (
  id bigint unsigned not null auto_increment,
  username varchar(64) not null,
  password_hash varchar(255) not null,
  display_name varchar(80) null,
  avatar_color varchar(16) not null default '#6657d3',
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  primary key (id),
  unique key uq_aether_users_username (username)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists aether_sessions (
  id bigint unsigned not null auto_increment,
  token_hash char(64) not null,
  user_id bigint unsigned not null,
  expires_at timestamp not null,
  created_at timestamp not null default current_timestamp,
  primary key (id),
  unique key uq_aether_sessions_token (token_hash),
  key idx_aether_sessions_user (user_id),
  key idx_aether_sessions_expiry (expires_at),
  constraint fk_aether_sessions_user foreign key (user_id) references aether_users (id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists aether_site_settings (
  section_key varchar(32) not null,
  value_json longtext not null,
  updated_by bigint unsigned null,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  primary key (section_key),
  key idx_aether_site_settings_user (updated_by),
  constraint fk_aether_site_settings_user foreign key (updated_by) references aether_users (id) on delete set null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
