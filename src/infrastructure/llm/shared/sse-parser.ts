/** Incremental SSE framing; decoding bytes belongs to the transport, before framing. */
export class SseParser {
  private buffer = '';
  private data: string[] = [];

  push(text: string, final = false): string[] {
    this.buffer += text;
    const events: string[] = [];
    const line = (value: string) => {
      if (value === '') {
        if (this.data.length) events.push(this.data.join('\n'));
        this.data = [];
      } else if (value.startsWith('data:')) {
        this.data.push(value.slice(5).replace(/^ /, ''));
      }
    };
    let newline = this.buffer.indexOf('\n');
    while (newline >= 0) {
      line(this.buffer.slice(0, newline).replace(/\r$/, ''));
      this.buffer = this.buffer.slice(newline + 1);
      newline = this.buffer.indexOf('\n');
    }
    if (final) {
      if (this.buffer) line(this.buffer.replace(/\r$/, ''));
      this.buffer = '';
      line('');
    }
    return events;
  }
}
