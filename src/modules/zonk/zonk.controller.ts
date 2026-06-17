export class ZonkController {
  async getZonk(): Promise<{ message: string }> {
    return { message: 'zonk' };
  }
}
