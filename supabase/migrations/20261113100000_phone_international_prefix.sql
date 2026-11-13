-- Adds the international prefix to profile phone numbers saved before the
-- country-code selector existed. Numbers already starting with "+" are kept;
-- "00…" becomes "+…"; bare local numbers were Italian, so they get "+39"
-- (an Italian mobile like 393… keeps its own 3 after the +39).
UPDATE public.profiles
SET phone = CASE
  WHEN regexp_replace(phone, '[^0-9+]', '', 'g') LIKE '+%' THEN regexp_replace(phone, '[^0-9+]', '', 'g')
  WHEN regexp_replace(phone, '[^0-9]', '', 'g') LIKE '00%' THEN '+' || substr(regexp_replace(phone, '[^0-9]', '', 'g'), 3)
  ELSE '+39' || regexp_replace(phone, '[^0-9]', '', 'g')
END
WHERE phone IS NOT NULL
  AND length(regexp_replace(phone, '[^0-9]', '', 'g')) BETWEEN 6 AND 15
  AND phone !~ '^\+[0-9]{8,15}$';
