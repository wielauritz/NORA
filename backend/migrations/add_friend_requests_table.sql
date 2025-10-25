-- Migration Script: Add friend_requests table for V2 Friends API
-- This script creates the new friend_requests table while keeping the old friends table intact
-- The old friends table remains for V1 API backwards compatibility

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON friend_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

-- Create unique constraint to prevent duplicate friend requests
-- This ensures that there can only be one pending or accepted request between two users (in either direction)
CREATE UNIQUE INDEX IF NOT EXISTS unique_friend_request
ON friend_requests(
    LEAST(requester_id, receiver_id),
    GREATEST(requester_id, receiver_id)
)
WHERE status IN ('pending', 'accepted');

-- Optional: Migrate existing friendships from V1 to V2
-- This converts all existing friendships to accepted friend requests in the new table
-- Uncomment the following lines if you want to migrate existing data:

-- INSERT INTO friend_requests (requester_id, receiver_id, status, created_at, updated_at)
-- SELECT
--     user_id1 as requester_id,
--     user_id2 as receiver_id,
--     'accepted' as status,
--     created_at,
--     created_at as updated_at
-- FROM friends
-- WHERE NOT EXISTS (
--     SELECT 1 FROM friend_requests fr
--     WHERE (fr.requester_id = friends.user_id1 AND fr.receiver_id = friends.user_id2)
--        OR (fr.requester_id = friends.user_id2 AND fr.receiver_id = friends.user_id1)
-- );

-- Note: The old 'friends' table is NOT modified or dropped
-- V1 API endpoints will continue to work with the old table
-- V2 API endpoints will use the new friend_requests table
