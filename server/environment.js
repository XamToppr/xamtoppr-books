export function getSanityWriteToken(env) {
  return env.SANITY_API_WRITE_TOKEN?.trim()
    || env.SANITY_WRITE_TOKEN?.trim()
    || env.VITE_SANITY_API_WRITE_TOKEN?.trim()
    || '';
}
