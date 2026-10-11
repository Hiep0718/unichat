-- V29: Ensure primary administrator has ADMIN system role for Admin Portal access
UPDATE users 
SET system_role = 'ADMIN' 
WHERE lower(email) IN ('taolahieptqn122@gmail.com', 'admin@unichat.test', 'alice.expert@unichat.test')
   OR lower(email) LIKE '%admin%';
