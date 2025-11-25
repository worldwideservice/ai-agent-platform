-- Обновить триальные периоды для всех пользователей с истекшим или null trialEndsAt
UPDATE users
SET
  trial_ends_at = NOW() + INTERVAL '15 days',
  responses_limit = 500,
  responses_used = 0,
  updated_at = NOW()
WHERE current_plan = 'trial'
  AND (trial_ends_at IS NULL OR trial_ends_at <= NOW());

-- Показать обновленных пользователей
SELECT
  id,
  email,
  current_plan,
  trial_ends_at,
  responses_limit,
  responses_used
FROM users
WHERE current_plan = 'trial';
