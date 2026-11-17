import { App, Form, Input, Modal, Select } from 'antd';
import { useState } from 'react';
import { toApiError } from '@/services/apiError';
import { useRejectApplication } from '../queries';
import { REJECTION_REASON_LABELS, type RejectionReason } from '../types';
import { toOptions } from '@/features/jobs/types';

interface RejectModalProps {
  applicationId: number;
  candidateName: string;
  open: boolean;
  onClose: () => void;
}

export function RejectModal({ applicationId, candidateName, open, onClose }: RejectModalProps) {
  const { message } = App.useApp();
  const reject = useRejectApplication();
  const [reason, setReason] = useState<RejectionReason | undefined>();
  const [note, setNote] = useState('');
  const noteRequired = reason === 'other';

  const submit = () => {
    if (!reason || (noteRequired && !note.trim())) return;
    reject.mutate(
      { id: applicationId, reason, note: note.trim() || undefined },
      {
        onSuccess: () => {
          void message.success(`${candidateName} was rejected.`);
          setReason(undefined);
          setNote('');
          onClose();
        },
        onError: (error) => void message.error(toApiError(error).message),
      },
    );
  };

  return (
    <Modal
      title={`Reject ${candidateName}`}
      open={open}
      onCancel={onClose}
      onOk={submit}
      okText="Reject"
      okButtonProps={{ danger: true, disabled: !reason || (noteRequired && !note.trim()) }}
      confirmLoading={reject.isPending}
      destroyOnHidden
    >
      <Form layout="vertical" component={false}>
        <Form.Item label="Reason" htmlFor="reject-reason" required>
          <Select<RejectionReason>
            id="reject-reason"
            value={reason}
            onChange={setReason}
            options={toOptions(REJECTION_REASON_LABELS)}
            placeholder="Choose a reason"
          />
        </Form.Item>
        <Form.Item
          label="Internal note"
          htmlFor="reject-note"
          required={noteRequired}
          extra="Visible to your team only. The candidate is not notified automatically."
        >
          <Input.TextArea
            id="reject-note"
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
