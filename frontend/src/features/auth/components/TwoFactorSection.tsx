import { SafetyCertificateOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Input, Popconfirm, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { toApiError } from '@/services/apiError';
import * as api from '../api';
import { authKeys } from '../queries';
import type { AuthUser } from '../types';
import { usePasswordConfirmation } from '../usePasswordConfirmation';

type Step = 'idle' | 'setup' | 'recovery';

function svgToDataUri(svg: string): string {
  // Shown as an <img>, never injected as HTML.
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function TwoFactorSection({ user }: { user: AuthUser }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { withConfirmation, modal } = usePasswordConfirmation();
  const [step, setStep] = useState<Step>('idle');
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const refreshUser = () => queryClient.invalidateQueries({ queryKey: authKeys.me() });

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      if (error instanceof Error && error.message === 'Password confirmation cancelled.') return;
      void message.error(toApiError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const startSetup = () =>
    run(async () => {
      await withConfirmation(api.enableTwoFactor);
      setQr(await api.fetchTwoFactorQrCode());
      setCode('');
      setCodeError(null);
      setStep('setup');
    });

  const confirmSetup = () =>
    run(async () => {
      try {
        await api.confirmTwoFactor(code.trim());
      } catch (error) {
        const apiError = toApiError(error);
        if (apiError.isValidation) {
          setCodeError('The code is invalid. Check your authenticator app and try again.');
          return;
        }
        throw error;
      }
      setRecoveryCodes(await api.fetchRecoveryCodes());
      setStep('recovery');
      await refreshUser();
      void message.success('Two-factor authentication is on.');
    });

  const showRecoveryCodes = () =>
    run(async () => {
      setRecoveryCodes(await withConfirmation(api.fetchRecoveryCodes));
      setStep('recovery');
    });

  const regenerate = () =>
    run(async () => {
      await withConfirmation(api.regenerateRecoveryCodes);
      setRecoveryCodes(await api.fetchRecoveryCodes());
      setStep('recovery');
    });

  const disable = () =>
    run(async () => {
      await withConfirmation(api.disableTwoFactor);
      setStep('idle');
      setRecoveryCodes([]);
      await refreshUser();
      void message.success('Two-factor authentication is off.');
    });

  return (
    <Card
      title={
        <Space>
          <SafetyCertificateOutlined />
          Two-factor authentication
          {user.two_factor_enabled ? <Tag color="success">On</Tag> : <Tag>Off</Tag>}
        </Space>
      }
    >
      {modal}

      {step === 'setup' && qr ? (
        <div className="flex max-w-md flex-col gap-4">
          <Typography.Paragraph>
            Scan this QR code with an authenticator app (such as 1Password, Authy or Google
            Authenticator), then enter the 6-digit code it shows.
          </Typography.Paragraph>
          <img
            src={svgToDataUri(qr)}
            alt="Two-factor authentication QR code"
            className="h-48 w-48"
          />
          <div>
            <Input
              aria-label="Authentication code"
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              status={codeError ? 'error' : undefined}
              onChange={(event) => setCode(event.target.value)}
              onPressEnter={() => void confirmSetup()}
            />
            {codeError ? <Typography.Text type="danger">{codeError}</Typography.Text> : null}
          </div>
          <Space>
            <Button
              type="primary"
              loading={busy}
              onClick={() => void confirmSetup()}
              disabled={code.trim().length !== 6}
            >
              Confirm
            </Button>
            <Button onClick={() => void disable()} disabled={busy}>
              Cancel
            </Button>
          </Space>
        </div>
      ) : null}

      {step === 'recovery' && recoveryCodes.length > 0 ? (
        <div className="mb-4 max-w-md">
          <Alert
            type="warning"
            showIcon
            title="Store these recovery codes somewhere safe"
            description="Each code can be used once to sign in if you lose access to your authenticator app."
            className="mb-3"
          />
          <pre className="rounded-lg bg-slate-100 p-4 font-mono text-sm">
            {recoveryCodes.join('\n')}
          </pre>
        </div>
      ) : null}

      {step !== 'setup' ? (
        user.two_factor_enabled ? (
          <Space wrap>
            <Button onClick={() => void showRecoveryCodes()} loading={busy}>
              Show recovery codes
            </Button>
            <Button onClick={() => void regenerate()} disabled={busy}>
              Regenerate recovery codes
            </Button>
            <Popconfirm
              title="Turn off two-factor authentication?"
              description="Your account will be protected by your password only."
              okText="Turn off"
              okButtonProps={{ danger: true }}
              onConfirm={() => void disable()}
            >
              <Button danger disabled={busy}>
                Turn off
              </Button>
            </Popconfirm>
          </Space>
        ) : (
          <div className="max-w-md">
            <Typography.Paragraph type="secondary">
              Add a second step to sign in: a code from your phone in addition to your password.
            </Typography.Paragraph>
            <Button type="primary" onClick={() => void startSetup()} loading={busy}>
              Turn on two-factor authentication
            </Button>
          </div>
        )
      ) : null}
    </Card>
  );
}
