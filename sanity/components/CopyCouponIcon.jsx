import { CopyIcon } from '@sanity/icons/Copy';
import { Button } from '@sanity/ui';
import { useToast } from '@sanity/ui/toast';

export default function CopyCouponIcon({ code: couponCode, title }) {
  const toast = useToast();
  const code = couponCode || title;

  const copyCode = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      toast.push({
        title: `Copied coupon "${code}" to clipboard!`,
        status: 'success',
        duration: 2500
      });
    } catch (error) {
      console.error('Unable to copy the coupon code:', error);
      toast.push({
        title: 'Unable to copy coupon code',
        description: 'Check clipboard permissions and try again.',
        status: 'error'
      });
    }
  };

  return (
    <Button
      type="button"
      mode="ghost"
      icon={CopyIcon}
      title="Click to copy code"
      aria-label={`Click to copy code${code ? ` ${code}` : ''}`}
      disabled={!code}
      onClick={copyCode}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
