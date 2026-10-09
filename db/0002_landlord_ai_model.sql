-- Store a landlord's selected OpenRouter model without storing any API credential.
-- The OpenRouter API key remains a Neon Function environment secret.
ALTER TABLE public.landlord_profiles
  ADD COLUMN ai_model text;

ALTER TABLE public.landlord_profiles
  ADD CONSTRAINT landlord_profiles_ai_model_length_check
  CHECK (ai_model IS NULL OR char_length(trim(ai_model)) BETWEEN 3 AND 200);
