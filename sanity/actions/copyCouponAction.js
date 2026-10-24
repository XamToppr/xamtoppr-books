import { CopyIcon } from '@sanity/icons/Copy';
import { useToast } from '@sanity/ui/toast';

export default function CopyCouponAction(props) {
  const toast = useToast();
  const code = props.draft?.code || props.published?.code;

  return {
    label: 'Copy Coupon Code',
    icon: CopyIcon,
    disabled: !code,
    onHandle: async () => {
      if (!code) return;

      try {
        await navigator.clipboard.writeText(code);
        toast.push({
          title: `Copied "${code}" to clipboard!`,
          status: 'success',
          duration: 2500
        });
      } catch {
        console.error('Unable to copy the coupon code.');
        toast.push({
          title: 'Unable to copy coupon code',
          description: 'Check clipboard permissions and try again.',
          status: 'error'
        });
      }
    }
  };
}

CopyCouponAction.action = 'copyCouponCode';
CopyCouponAction.displayName = 'CopyCouponAction';
