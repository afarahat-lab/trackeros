import { ZonkController } from '../../../../src/modules/zonk/zonk.controller';

describe('ZonkController', () => {
  it('should return { message: "zonk" }', async () => {
    const controller = new ZonkController();
    const result = await controller.getZonk();
    expect(result).toEqual({ message: 'zonk' });
  });
});
