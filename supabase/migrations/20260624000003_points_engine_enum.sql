-- Distinct transaction types for automatic event check-in / check-out points.
alter type points_type add value if not exists 'check_in';
alter type points_type add value if not exists 'check_out';
