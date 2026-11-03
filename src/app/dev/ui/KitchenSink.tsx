'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { ToastProvider, useToast } from '@/components/ui/Toast';

function Inner() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'file' | 'url'>('file');
  const variants = ['primary', 'secondary', 'outline', 'ghost', 'dark', 'green', 'danger'] as const;
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-h1 font-bold">UI kitchen sink</h1>
      <Card className="space-y-3">
        <h2 className="text-h3 font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          {variants.map((v) => (
            <Button key={v} variant={v}>
              {v}
            </Button>
          ))}
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </Card>
      <Card className="space-y-3">
        <h2 className="text-h3 font-semibold">Inputs</h2>
        <Input label="Email" placeholder="you@example.com" />
        <Input label="With error" defaultValue="nope" error="Enter a valid email." />
        <Input label="With hint" hint="We never share this." />
      </Card>
      <Card className="space-y-3">
        <h2 className="text-h3 font-semibold">Tabs</h2>
        <Tabs
          label="Source"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'file', label: 'File' },
            { id: 'url', label: 'URL' },
          ]}
        />
      </Card>
      <Card className="flex flex-wrap gap-3">
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Button variant="secondary" onClick={() => toast('Saved', 'success')}>
          Toast
        </Button>
        <Button variant="danger" onClick={() => toast('Something failed', 'error')}>
          Error toast
        </Button>
      </Card>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Confirm"
        footer={<Button onClick={() => setOpen(false)}>OK</Button>}
      >
        Modal body text.
      </Modal>
    </main>
  );
}

export function KitchenSink() {
  return (
    <ToastProvider>
      <Inner />
    </ToastProvider>
  );
}
