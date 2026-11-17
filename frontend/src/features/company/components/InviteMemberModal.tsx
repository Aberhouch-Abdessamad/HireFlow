import { zodResolver } from '@hookform/resolvers/zod';
import { App, Form, Modal } from 'antd';
import { useForm } from 'react-hook-form';
import { FormInput } from '@/components/form/FormInput';
import { FormSelect } from '@/components/form/FormSelect';
import { applyApiErrors } from '@/utils/forms';
import { useCreateInvitation } from '../queries';
import { inviteSchema, type InviteValues } from '../schemas';
import { COMPANY_ROLE_OPTIONS } from '../types';

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
}

export function InviteMemberModal({ open, onClose }: InviteMemberModalProps) {
  const { message } = App.useApp();
  const createInvitation = useCreateInvitation();
  const { control, handleSubmit, setError, reset } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'recruiter' },
  });

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: InviteValues) => {
    try {
      await createInvitation.mutateAsync(values);
      void message.success(`Invitation sent to ${values.email}.`);
      close();
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, ['email', 'role']);
      if (!mapped) setError('email', { type: 'server', message: apiError.message });
    }
  };

  return (
    <Modal
      title="Invite a team member"
      open={open}
      okText="Send invitation"
      onOk={() => void handleSubmit(onSubmit)()}
      confirmLoading={createInvitation.isPending}
      onCancel={close}
      destroyOnHidden
    >
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
        <Form layout="vertical" component={false}>
          <FormInput control={control} name="email" label="Email" type="email" autoFocus required />
          <FormSelect
            control={control}
            name="role"
            label="Role"
            options={COMPANY_ROLE_OPTIONS}
            required
          />
        </Form>
      </form>
    </Modal>
  );
}
