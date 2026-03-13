-- Seed default admin account (password: admin123)
INSERT INTO restorano.admin (username, email, password)
VALUES ('admin', 'admin@restorano.com', '$2a$12$dmKLQReHCe55q7LEwjlvWujUqUTKjPrncsoP5C5hM9wyfbI.cmsoW')
ON CONFLICT DO NOTHING;
