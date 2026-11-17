import { Form, Select } from 'antd';
import type { ReactNode } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

export interface SelectOption {
  value: string;
  label: ReactNode;
}

interface FormSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: ReactNode;
  options: SelectOption[];
  required?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  showSearch?: boolean;
}

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  required,
  placeholder,
  allowClear,
  showSearch,
}: FormSelectProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Form.Item
          label={label}
          htmlFor={name}
          required={required}
          validateStatus={fieldState.error ? 'error' : undefined}
          help={fieldState.error?.message}
        >
          <Select
            id={name}
            value={(field.value as string | null | undefined) ?? undefined}
            onChange={(value: string | undefined) => field.onChange(value ?? null)}
            onBlur={field.onBlur}
            options={options}
            placeholder={placeholder}
            allowClear={allowClear}
            showSearch={showSearch ? { optionFilterProp: 'label' } : undefined}
            status={fieldState.error ? 'error' : undefined}
          />
        </Form.Item>
      )}
    />
  );
}
