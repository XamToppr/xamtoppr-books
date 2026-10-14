import { useEffect, useRef, useState } from 'react';
import { useToast } from '@sanity/ui/toast';
import { usePaneRouter } from 'sanity/structure';

export function createCouponPublishAction(DefaultPublishAction) {
  function CouponPublishAction(props) {
    const toast = useToast();
    const paneRouter = usePaneRouter();
    const [publishRequested, setPublishRequested] = useState(false);
    const publishedRevision = props.published?._rev;
    const previousRevision = useRef(publishedRevision);

    useEffect(() => {
      if (!publishRequested) {
        previousRevision.current = publishedRevision;
        return;
      }
      if (!publishedRevision || publishedRevision === previousRevision.current) return;

      toast.push({
        title: 'Coupon published successfully.',
        status: 'success',
        duration: 3000
      });
      paneRouter.closeCurrentAndAfter();
      setPublishRequested(false);
    }, [paneRouter, publishRequested, publishedRevision, toast]);

    const action = DefaultPublishAction(props);
    if (!action) return action;

    return {
      ...action,
      onHandle: () => {
        previousRevision.current = props.published?._rev;
        setPublishRequested(true);
        action.onHandle?.();
      }
    };
  }
  CouponPublishAction.action = DefaultPublishAction.action;
  CouponPublishAction.displayName = 'CouponPublishAction';
  return CouponPublishAction;
}
