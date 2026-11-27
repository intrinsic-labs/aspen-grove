import type { ULID } from '@domain/value-objects';

/** Draws whose generation work is still owned by this application process. */
export class ActiveBufferDraws {
  private readonly drawIds = new Set<ULID>();

  begin(drawId: ULID): void {
    this.drawIds.add(drawId);
  }

  end(drawId: ULID): void {
    this.drawIds.delete(drawId);
  }

  isActive(drawId: ULID): boolean {
    return this.drawIds.has(drawId);
  }
}
