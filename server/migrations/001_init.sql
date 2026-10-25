-- Ollie's Phonics, Phase 2 schema. Children are stored with a NICKNAME and an emoji AVATAR only:
-- no real name, no email, no birth date, no photo.

CREATE TABLE teachers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE classes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  class_code text NOT NULL UNIQUE CHECK (class_code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX classes_teacher_idx ON classes (teacher_id);

CREATE TABLE students (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  nickname   text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 20),
  avatar     text NOT NULL CHECK (char_length(avatar) BETWEEN 1 AND 16),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, nickname)
);
CREATE INDEX students_class_idx ON students (class_id);

-- One row per student + item. stars = best result (0-3). attempts/misses feed the "most missed" lists.
CREATE TABLE progress (
  id         bigserial PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('letter', 'word', 'story', 'game', 'sight')),
  item_id    text NOT NULL CHECK (char_length(item_id) BETWEEN 1 AND 64),
  stars      smallint NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
  attempts   integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  misses     integer NOT NULL DEFAULT 0 CHECK (misses >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, type, item_id)
);
CREATE INDEX progress_student_idx ON progress (student_id);
