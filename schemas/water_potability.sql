create table public.water_potability (
  id uuid not null default gen_random_uuid (),
  ph numeric null,
  hardness numeric null,
  solids numeric null,
  chloramines numeric null,
  sulfate numeric null,
  conductivity numeric null,
  organic_carbon numeric null,
  trihalomethanes numeric null,
  turbidity numeric null,
  is_potable boolean null,
  constraint water_potability_pkey primary key (id)
) TABLESPACE pg_default;