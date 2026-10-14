import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemaTypes.js';
import StudentActivityLeads from './src/components/admin/StudentActivityLeads.jsx';

const actionWrappers = new WeakMap();

function keepDestructiveActionsEnabled(Action) {
  const cachedAction = actionWrappers.get(Action);
  if (cachedAction) return cachedAction;

  const WrappedAction = (props) => {
    const action = Action(props);
    if (action?.action !== 'delete' && action?.action !== 'discardChanges') return action;
    return { ...action, disabled: false };
  };

  actionWrappers.set(Action, WrappedAction);
  return WrappedAction;
}

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
    actions: (prev) => prev.map(keepDestructiveActionsEnabled)
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
