import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemaTypes.js';
import StudentActivityLeads from './src/components/admin/StudentActivityLeads.jsx';

const ADMIN_ROLE = 'administrator';
const RESTRICTED_ACTIONS = new Set(['delete', 'discardChanges', 'unpublish']);

export default defineConfig({
  name: 'default',
  title: 'XamToppr Admin Portal',
  projectId: 'rkev3aui',
  dataset: 'production',
  basePath: '/admin',
  tools: (prev) => [
    ...prev,
    {
      name: 'student-activity-leads',
      title: 'Student Activity & Leads',
      component: StudentActivityLeads
    }
  ],
  document: {
    actions: (prev, context) => {
      const isAdministrator = context.currentUser?.roles?.some(
        (role) => role.name === ADMIN_ROLE
      );
      if (isAdministrator) return prev;
      return prev.filter((Action) => !RESTRICTED_ACTIONS.has(Action.action));
    }
  },
  plugins: [
    structureTool({
      structure: (S) => S.list()
        .title('Content')
        .items([
          S.listItem()
            .title('Site Settings')
            .id('siteSettings')
            .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
          S.divider(),
          ...S.documentTypeListItems().filter((item) => item.getId() !== 'siteSettings')
        ])
    })
  ],
  schema: {
    types: schemaTypes
  }
});
