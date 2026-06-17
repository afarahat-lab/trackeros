import { QuxController } from "./qux.controller";

export async function quxRoutes(fastify: any): Promise<void> {
  const controller = new QuxController();

  fastify.get("/qux", async (request: any, reply: any) => {
    await controller.getQux(request, reply);
  });
}
