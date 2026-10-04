/** Fail closed: only known non-prod envs serve the route map. */
export function shouldExposeSwagger(nodeEnv = process.env.NODE_ENV): boolean {
  return nodeEnv === 'development' || nodeEnv === 'test';
}
