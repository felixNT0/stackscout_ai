import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "stackscout-ai",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
