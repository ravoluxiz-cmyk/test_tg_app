-- Обновляем роль пользователя dprilepsky на admin
UPDATE users 
SET role = 'admin', 
    updated_at = NOW()
WHERE username = 'dprilepsky';

-- Проверяем результат
SELECT id, username, role, updated_at 
FROM users 
WHERE username = 'dprilepsky';