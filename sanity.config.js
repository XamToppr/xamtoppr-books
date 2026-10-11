import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemaTypes.js';

export default defineConfig({
  name: 'default',
  title: 'XamToppr Admin Portal',
  projectId: 'rkev3aui',
  dataset: 'production',
  basePath: '/admin',
  plugins: [structureTool()],
  schema: {
    types: schemaTypes
  }
});
