export class QuxController {
  async getQux(request: any, reply: any): Promise<void> {
    reply.status(200).send({ message: 'qux' });
  }
}
