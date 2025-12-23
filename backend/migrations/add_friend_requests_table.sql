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

-- Note: The old 'friends' table is NOT modified or dropped
-- V1 API endpoints will continue to work with the old table
-- V2 API endpoints will use the new friend_requests table
