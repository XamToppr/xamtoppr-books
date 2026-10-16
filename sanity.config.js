import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemaTypes.js';
import StudentActivityLeads from './src/components/admin/StudentActivityLeads.jsx';
import CopyCouponAction from './sanity/actions/copyCouponAction.js';
import { createCouponPublishAction } from './sanity/couponActions.js';

const ADMIN_ROLE = 'administrator';
const RESTRICTED_ACTIONS = new Set(['delete', 'discardChanges', 'unpublish']);
const MASTER_TYPES = new Set(['track', 'platform', 'subject', 'module', 'topic']);

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
      const accessControlledActions = isAdministrator
        ? prev
        : prev.filter((Action) => !RESTRICTED_ACTIONS.has(Action.action));
      if (context.schemaType !== 'coupon') return accessControlledActions;

      return [
        ...accessControlledActions.map((Action) => (
          Action.action === 'publish' ? createCouponPublishAction(Action) : Action
        )),
        CopyCouponAction
      ];
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
          S.listItem()
            .title('Master')
            .id('master')
            .child(
              S.list()
                .title('Master')
                .items([
                  S.documentTypeListItem('track').title('Track'),
                  S.documentTypeListItem('platform').title('Platform'),
                  S.documentTypeListItem('subject').title('Subject'),
                  S.documentTypeListItem('module').title('Module'),
                  S.documentTypeListItem('topic').title('Topics')
                ])
            ),
          S.divider(),
          ...S.documentTypeListItems().filter(
            (item) => item.getId() !== 'siteSettings' && !MASTER_TYPES.has(item.getId())
          )
        ])
    })
  ],
  schema: {
    types: schemaTypes
  }
});
