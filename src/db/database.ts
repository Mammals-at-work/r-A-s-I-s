import { Pool } from "pg";

export interface QueryResultRow {
  [column: string]: unknown;
}

export interface DbClient {
  query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
  end?(): Promise<void>;
}

export function createDatabase(connectionString: string): DbClient {
  return new Pool({
    connectionString
  });
}
