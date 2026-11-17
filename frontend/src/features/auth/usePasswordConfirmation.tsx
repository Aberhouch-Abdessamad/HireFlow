import { Form, Input, Modal, Typography } from 'antd';
import { useCallback, useRef, useState } from 'react';
import { toApiError } from '@/services/apiError';
import { confirmPassword } from './api';

/**
 * Runs a sensitive action. If the API answers 423 (password confirmation required), asks for
 * the password, confirms it with Fortify, and retries the action once.
 */
export function usePasswordConfirmation() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef<{ resolve: () => void; reject: (reason: unknown) => void } | null>(null);

  const withConfirmation = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    try {
      return await action();
    } catch (err) {
      if (!toApiError(err).needsPasswordConfirmation) {
        throw err;
      }
      await new Promise<void>((resolve, reject) => {
        pending.current = { resolve, reject };
        setPassword('');
        setError(null);
        setOpen(true);
      });
      return action();
    }
  }, []);

  const onOk = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await confirmPassword(password);
      setOpen(false);
      pending.current?.resolve();
    } catch (err) {
      const apiError = toApiError(err);
      setError(apiError.fieldErrors.password?.[0] ?? apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = () => {
    setOpen(false);
    pending.current?.reject(new Error('Password confirmation cancelled.'));
  };

  const modal = (
    <Modal
      title="Confirm your password"
      open={open}
      onOk={() => void onOk()}
      onCancel={onCancel}
      okText="Confirm"
      confirmLoading={submitting}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary">
        For your security, please confirm your password to continue.
      </Typography.Paragraph>
      <Form layout="vertical" component={false}>
        <Form.Item
          label="Password"
          htmlFor="confirm-password"
          validateStatus={error ? 'error' : undefined}
          help={error}
        >
          <Input.Password
            id="confirm-password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onPressEnter={() => void onOk()}
          />
        </Form.Item>
      </Form>
    </Modal>
  );

  return { withConfirmation, modal };
}
