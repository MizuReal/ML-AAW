create table public.forum_bad_words (
  word text not null,
  constraint forum_bad_words_pkey primary key (word)
) TABLESPACE pg_default;