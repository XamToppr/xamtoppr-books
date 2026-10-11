import { createClient } from '@sanity/client';

const sanityClient = createClient({
  projectId: 'rkev3aui',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01'
});

export default sanityClient;
