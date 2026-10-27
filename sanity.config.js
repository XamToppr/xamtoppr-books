import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { table } from '@sanity/table';
import { schemaTypes } from './sanity/schemaTypes.js';
import StudentActivityLeads from './src/components/admin/StudentActivityLeads.jsx';
import FileUpload from './src/components/admin/FileUpload.jsx';
import CopyCouponAction from './sanity/actions/copyCouponAction.js';
import { createCouponPublishAction } from './sanity/couponActions.js';

const ADMIN_ROLE = 'administrator';
const RESTRICTED_ACTIONS = new Set(['delete', 'discardChanges', 'unpublish']);
const MASTER_TYPES = new Set(['track', 'platform', 'subject', 'module', 'topic']);
const DEDICATED_TYPES = new Set(['siteSettings', 'onlineClass', ...MASTER_TYPES]);

const onlineClassesByTaxonomy = (S) => S.documentTypeList('track')
  .title('Track')
  .child((trackId) => S.documentTypeList('platform')
    .title('Platform')
    .filter('_type == "platform" && track._ref == $trackId')
    .params({ trackId })
    .child((platformId) => S.documentTypeList('subject')
      .title('Subject')
      .filter('_type == "subject" && platform._ref == $platformId')
      .params({ platformId })
      .child((subjectId) => S.documentTypeList('module')
        .title('Module')
        .filter('_type == "module" && subject._ref == $subjectId')
        .params({ subjectId })
        .child((moduleId) => S.documentTypeList('topic')
          .title('Topic')
          .filter('_type == "topic" && module._ref == $moduleId')
          .params({ moduleId })
          .child((topicId) => S.documentTypeList('onlineClass')
            .title('Online Course Classes')
            .filter(
              '_type == "onlineClass" && track._ref == $trackId && platform._ref == $platformId && subject._ref == $subjectId && module._ref == $moduleId && topic._ref == $topicId'
            )
            .params({ trackId, platformId, subjectId, moduleId, topicId }))))));

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
    },
    {
      name: 'file-upload',
      title: 'File Upload',
      component: FileUpload
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
    table(),
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
          S.listItem()
            .title('Online Course Classes')
            .id('onlineCourseClasses')
            .child(
              S.list()
                .title('Online Course Classes')
                .items([
                  S.documentTypeListItem('onlineClass').title('All Classes'),
                  S.listItem()
                    .title('Browse by Master Taxonomy')
                    .child(onlineClassesByTaxonomy(S))
                ])
            ),
          S.divider(),
          ...S.documentTypeListItems().filter(
            (item) => !DEDICATED_TYPES.has(item.getId())
          )
        ])
    })
  ],
  schema: {
    types: schemaTypes
  }
});
