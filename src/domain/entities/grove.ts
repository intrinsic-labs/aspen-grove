import { ULID } from '../value-objects';

export interface Grove {
  readonly id: ULID;
  readonly name: string;
  readonly ownerAgentId: ULID;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
