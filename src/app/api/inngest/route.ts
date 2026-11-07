import { inngest } from "@/inngest/client";
import {
  dailyDiscovery,
  onDemandDiscovery,
  processAlerts,
  refreshJobStatus,
} from "@/inngest/functions";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    dailyDiscovery,
    onDemandDiscovery,
    refreshJobStatus,
    processAlerts,
  ],
});
