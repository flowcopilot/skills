type Job = { id: string; payload: string };
interface Env { DESTINATION_URL: string }

export default {
  async queue(batch: MessageBatch<Job>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await fetch(env.DESTINATION_URL, { method: "POST", body: message.body.payload });
      } catch (error) {
        console.error(error);
      }
    }
  },
};
