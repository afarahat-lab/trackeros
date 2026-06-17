export interface PongController {
  getPong: () => Promise<{ message: string }>;
}

export const pongController: PongController = {
  getPong: async () => ({ message: 'pong' })
};
