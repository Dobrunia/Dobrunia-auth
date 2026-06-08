import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function migration(name: string): string {
  return readFileSync(resolve('src/db/migrations', name), 'utf8')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

describe('client ownership and cascade migration contracts', () => {
  it('удаляет сессии и OAuth-коды вместе с приложением', () => {
    const schema = migration('001_schema.sql');

    expect(schema).toMatch(
      /foreign key \(client_id\) references clients \(id\) on delete cascade/
    );
    expect(schema).toMatch(
      /constraint fk_oauth_codes_client_id foreign key \(client_id\) references clients \(id\) on delete cascade/
    );
    expect(schema).toMatch(
      /foreign key \(session_id\) references sessions \(id\) on delete cascade/
    );
  });

  it('удаляет приложения вместе с удаленным аккаунтом владельца', () => {
    const migrationSql = migration('003_add_client_owners.sql');

    expect(migrationSql).toMatch(
      /foreign key \(owner_user_id\) references users \(id\) on delete cascade/
    );
  });
});
