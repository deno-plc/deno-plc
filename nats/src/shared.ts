import { getLogger } from "@logtape/logtape";

export const logger = getLogger(["app", "nats"]);

export const subscription_registry = new FinalizationRegistry<string>((subject) => {
    logger.warn`a subscription for ${subject} was not disposed correctly. This leads to memory leaks.`;
});
