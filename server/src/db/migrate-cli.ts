import { runMigrations } from './migrate';

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
  });
