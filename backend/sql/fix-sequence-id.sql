-- Disable foreign key constraints to allow string sequence IDs
-- We'll use string IDs like 'sutrahr-playbook-v1' for flexibility

-- Drop foreign key constraints that enforce UUID references
ALTER TABLE prospect_sequences 
DROP CONSTRAINT IF EXISTS prospect_sequences_sequence_id_fkey;

ALTER TABLE sequence_steps 
DROP CONSTRAINT IF EXISTS sequence_steps_sequence_id_fkey;
