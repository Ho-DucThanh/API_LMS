-- SQL DDL to create tables for saved learning paths (MySQL 8+)
-- Run these statements if TypeORM synchronize/migrations are disabled.

CREATE TABLE IF NOT EXISTS `learning_path` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `metadata` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_id` INT NOT NULL,
  `recommendation_id` INT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_learning_path_user` (`user_id`),
  CONSTRAINT `fk_learning_path_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_learning_path_recommendation` FOREIGN KEY (`recommendation_id`) REFERENCES `ai_recommendation`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `learning_path_item` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `path_id` INT NOT NULL,
  `course_id` INT NULL,
  `stage` VARCHAR(32) NOT NULL,
  `order_index` INT NOT NULL DEFAULT 0,
  `note` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_learning_path_item_path` (`path_id`),
  KEY `idx_learning_path_item_course` (`course_id`),
  CONSTRAINT `fk_learning_path_item_path` FOREIGN KEY (`path_id`) REFERENCES `learning_path`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_learning_path_item_course` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
