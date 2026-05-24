-- cars table for /api/cars-catalog in member_api.py
-- Required by code:
--   SELECT id, car_name, brand, model, rent_price, category
--   FROM cars WHERE status = 1 ORDER BY brand ASC, id ASC

CREATE TABLE IF NOT EXISTS `cars` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '车辆ID',
  `car_name` VARCHAR(120) NOT NULL COMMENT '车辆展示名；需与 carpark 目录名一致',
  `brand` VARCHAR(60) NOT NULL COMMENT '品牌，用于选车页品牌分组和筛选',
  `model` VARCHAR(120) NOT NULL COMMENT '车型/型号，用于卡片副标题兜底',
  `rent_price` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '日租价格，单位：元/天',
  `category` VARCHAR(60) NOT NULL COMMENT '分类，用于选车页分类筛选',
  `status` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1=上架，0=下架',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cars_car_name` (`car_name`),
  KEY `idx_cars_status_brand_id` (`status`, `brand`, `id`),
  KEY `idx_cars_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='车辆目录表';
