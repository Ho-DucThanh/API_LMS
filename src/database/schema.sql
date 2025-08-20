-- user
CREATE TABLE user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    bio TEXT,
    phone VARCHAR(11),
    address VARCHAR(255),
    status ENUM('ACTIVE', 'BLOCKED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- role
CREATE TABLE role (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name ENUM('ROLE_ADMIN','ROLE_TEACHER','ROLE_STUDENT') NOT NULL
);

-- user_role
CREATE TABLE user_role (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES `user`(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES `role`(id) ON DELETE CASCADE
);

-- tag
CREATE TABLE tag (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- course_category
CREATE TABLE course_category (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- course
CREATE TABLE course (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    thumbnail_url VARCHAR(500),
    price DECIMAL(10,2) DEFAULT 0,
    original_price DECIMAL(10,2) DEFAULT 0,
    duration_hours INT DEFAULT 0,
    total_enrolled INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    rating_count INT DEFAULT 0,
    level ENUM('BEGINNER','INTERMEDIATE','ADVANCED') DEFAULT 'BEGINNER',
    status ENUM('DRAFT','PUBLISHED','ARCHIVED') DEFAULT 'DRAFT',
    approval_status ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
    instructor_id INT NOT NULL,
    category_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES `user`(id),
    FOREIGN KEY (category_id) REFERENCES course_category(id)
);

-- course_tag (Many-to-Many relationship table)
CREATE TABLE course_tag (
    course_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (course_id, tag_id),
    FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
);

-- enrollment
CREATE TABLE enrollment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    status ENUM('ACTIVE','COMPLETED','DROPPED','PENDING') DEFAULT 'PENDING',
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES `user`(id),
    FOREIGN KEY (course_id) REFERENCES course(id),
    UNIQUE KEY unique_student_course (student_id, course_id)
);

-- modules
CREATE TABLE modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    course_id INT NOT NULL,
    order_index INT DEFAULT 0,
    duration_minutes INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES course(id)
);

-- lessons
CREATE TABLE lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('VIDEO','TEXT','QUIZ','PDF','LINK') NOT NULL,
    content LONGTEXT,
    file_url VARCHAR(500),
    status ENUM('SUBMITTED','GRADED','RETURNED') DEFAULT 'SUBMITTED',
    grade DECIMAL(5,2),
    feedback TEXT,
    graded_by INT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id),
    FOREIGN KEY (student_id) REFERENCES `user`(id),
    UNIQUE KEY unique_student_assignment (assignment_id, student_id)
);

-- assignments
CREATE TABLE assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type ENUM('ESSAY','MULTIPLE_CHOICE','FILE_UPLOAD','CODE') NOT NULL,
    content JSON,
    lesson_id INT NOT NULL,
    instructor_id INT NOT NULL,
    max_score DECIMAL(5,2) DEFAULT 100,
    due_date DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id),
    FOREIGN KEY (instructor_id) REFERENCES `user`(id)
);

-- submissions
CREATE TABLE submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    content TEXT,
    file_url VARCHAR(500),
    status ENUM('SUBMITTED','GRADED','RETURNED') DEFAULT 'SUBMITTED',
    score DECIMAL(5,2),
    feedback TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graded_at TIMESTAMP NULL,
    graded_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id),
    FOREIGN KEY (student_id) REFERENCES `user`(id),
    UNIQUE KEY unique_student_assignment (assignment_id, student_id)
);


-- progress
CREATE TABLE progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT NOT NULL,
    module_id INT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    completed_at TIMESTAMP NULL,
    time_spent_minutes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES enrollment(id),
    FOREIGN KEY (module_id) REFERENCES modules(id),
    UNIQUE KEY unique_enrollment_module (enrollment_id, module_id)
);

-- lesson_progress
CREATE TABLE lesson_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT NOT NULL,
    lesson_id INT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    progress_percent DECIMAL(5,2) DEFAULT 0,
    time_spent_minutes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES enrollment(id),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id),
    UNIQUE KEY unique_enrollment_lesson (enrollment_id, lesson_id)
);

-- forum
CREATE TABLE forum (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES course(id)
);

-- forum_post
CREATE TABLE forum_post (
    id INT AUTO_INCREMENT PRIMARY KEY,
    forum_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (forum_id) REFERENCES forum(id),
    FOREIGN KEY (user_id) REFERENCES `user`(id)
);

-- forum_comment
CREATE TABLE forum_comment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES forum_post(id),
    FOREIGN KEY (user_id) REFERENCES `user`(id)
);

-- notification
CREATE TABLE notification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM(
        'COURSE_ENROLLMENT',
        'ASSIGNMENT_DUE',
        'GRADE_PUBLISHED',
        'FORUM_REPLY',
        'COURSE_UPDATE',
    'SYSTEM_ANNOUNCEMENT',
    'COURSE_APPROVAL_REQUEST'
    ) NOT NULL,
        user_id INT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        related_id INT NULL,
        action_url VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES `user`(id)
);

-- course_review
CREATE TABLE course_review (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES `user`(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_course_review (course_id, student_id)
);

-- -- system_config
-- CREATE TABLE system_config (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     config_key VARCHAR(255) UNIQUE,
--     config_value TEXT
-- );

-- -- audit_log
-- CREATE TABLE audit_log (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     user_id INT,
--     action VARCHAR(255),
--     target_table VARCHAR(255),
--     target_id INT,
--     description TEXT,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (user_id) REFERENCES `user`(id)
-- );

-- -- report
-- CREATE TABLE report (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     title VARCHAR(255),
--     content TEXT,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- analytic
-- CREATE TABLE analytic (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     user_id INT,
--     course_id INT,
--     action VARCHAR(255),
--     value FLOAT,
--     logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (user_id) REFERENCES `user`(id),
--     FOREIGN KEY (course_id) REFERENCES course(id)
-- );
