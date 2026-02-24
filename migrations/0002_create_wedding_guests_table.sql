-- Migration number: 0002  2026-02-24T00:00:00.000Z
CREATE TABLE IF NOT EXISTS wedding_guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    relation TEXT,
    attend_status TEXT,
    with_guest TEXT,
    need_child_seat TEXT,
    need_vegetarian TEXT,
    need_invitation TEXT,
    email TEXT,
    address TEXT,
    phone TEXT,
    message TEXT,
    answer_time TEXT,
    answer_seconds INTEGER,
    ip TEXT,
    full_flag TEXT,
    user_record TEXT,
    member_time TEXT,
    hash TEXT
);