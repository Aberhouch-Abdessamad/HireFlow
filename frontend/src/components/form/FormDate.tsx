import { DatePicker, Form } from 'antd';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

interface FormDateProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: ReactNode;
  disabled?: boolean;
}

/** Date field stored as an ISO date string (YYYY-MM-DD) or null. */
export function FormDate<T extends FieldValues>({
  control,
  name,
  label,
  disabled,
}: FormDateProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Form.Item
          label={label}
          htmlFor={name}
          validateStatus={fieldState.error ? 'error' : undefined}
          help={fieldState.error?.message}
        >
          <DatePicker
            id={name}
            className="w-full"
            disabled={disabled}
            value={field.value ? dayjs(field.value as string) : null}
            onChange={(value) => field.onChange(value ? value.format('YYYY-MM-DD') : null)}
          />
        </Form.Item>
      )}
    />
  );
}
