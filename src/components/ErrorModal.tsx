import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

type Tone = 'error' | 'warning' | 'info';
const CONFIG = {
  error: { Icon: XCircle, color: 'text-ai', bg: 'bg-ai/10' },
  warning: { Icon: AlertTriangle, color: 'text-tamper-dark', bg: 'bg-tamper/15' },
  info: { Icon: Info, color: 'text-video', bg: 'bg-video/10' },
} as const;

/** Port of mobile ErrorModal (icon + title + message + single dismiss button). */
export function ErrorModal({
  open,
  title,
  message,
  type = 'error',
  dismissLabel = 'Got it',
  onDismiss,
}: {
  open: boolean;
  title: string;
  message: string;
  type?: Tone;
  dismissLabel?: string;
  onDismiss: () => void;
}) {
  const { Icon, color, bg } = CONFIG[type];
  return (
    <Modal
      open={open}
      onClose={onDismiss}
      title={title}
      footer={<Button onClick={onDismiss}>{dismissLabel}</Button>}
    >
      <div className="flex items-start gap-3">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${bg}`}>
          <Icon className={`size-5 ${color}`} aria-hidden />
        </span>
        <p role="alert">{message}</p>
      </div>
    </Modal>
  );
}
