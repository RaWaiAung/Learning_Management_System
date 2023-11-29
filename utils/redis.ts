import { Redis } from "ioredis";

const redisClient = () => {
  if (process.env.REDIS_HOST) {
    return process.env.REDIS_HOST;
  }
  throw new Error("Redis connection failed!");
};

export const redis = new Redis(redisClient());
