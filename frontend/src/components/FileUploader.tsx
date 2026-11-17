import { UploadOutlined } from '@ant-design/icons';
import { App, Button, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { useState } from 'react';
import { toApiError } from '@/services/apiError';

interface FileUploaderProps {
  /** Comma-separated list for the file picker, e.g. ".png,.jpg". */
  accept: string;
  /** Allowed MIME types, checked before upload (the API validates again). */
  mimeTypes: readonly string[];
  maxSizeMb: number;
  label: string;
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

/** Single-file uploader with client-side type/size checks and API error reporting. */
export function FileUploader({
  accept,
  mimeTypes,
  maxSizeMb,
  label,
  onUpload,
  disabled,
}: FileUploaderProps) {
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!mimeTypes.includes(file.type)) {
      void message.error(`Unsupported file type. Allowed: ${accept}`);
      return Upload.LIST_IGNORE;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      void message.error(`The file is larger than ${maxSizeMb} MB.`);
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const customRequest: UploadProps['customRequest'] = ({ file, onSuccess, onError }) => {
    setUploading(true);
    onUpload(file as File)
      .then(() => onSuccess?.(null))
      .catch((error: unknown) => {
        const apiError = toApiError(error);
        const fieldMessage = Object.values(apiError.fieldErrors)[0]?.[0];
        void message.error(fieldMessage ?? apiError.message);
        onError?.(apiError);
      })
      .finally(() => setUploading(false));
  };

  return (
    <Upload
      accept={accept}
      showUploadList={false}
      beforeUpload={beforeUpload}
      customRequest={customRequest}
      disabled={disabled || uploading}
    >
      <Button icon={<UploadOutlined />} loading={uploading} disabled={disabled}>
        {label}
      </Button>
    </Upload>
  );
}
