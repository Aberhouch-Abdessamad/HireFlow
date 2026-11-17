import { Form, Input } from 'antd';
import type { ReactNode } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

interface FormInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: ReactNode;
  type?: 'text' | 'email' | 'password' | 'url';
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  extra?: ReactNode;
  autoFocus?: boolean;
  inputMode?: 'text' | 'numeric' | 'email';
  maxLength?: number;
}

/** Ant Design input bound to React Hook Form, showing client and server validation errors. */
export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  type = 'text',
  required,
  extra,
  ...inputProps
}: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const common = {
          ...inputProps,
          id: name,
          name: field.name,
          value: (field.value as string | undefined) ?? '',
          onChange: field.onChange,
          onBlur: field.onBlur,
          ref: field.ref,
          status: fieldState.error ? ('error' as const) : undefined,
          'aria-invalid': fieldState.error ? true : undefined,
        };

        return (
          <Form.Item
            label={label}
            htmlFor={name}
            required={required}
            validateStatus={fieldState.error ? 'error' : undefined}
            help={fieldState.error?.message}
            extra={extra}
          >
            {type === 'password' ? (
              <Input.Password {...common} />
            ) : (
              <Input {...common} type={type} />
            )}
          </Form.Item>
        );
      }}
    />
  );
}
