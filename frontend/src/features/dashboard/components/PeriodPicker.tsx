import { DatePicker, Segmented } from 'antd';
import type { Dayjs } from 'dayjs';

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
];

interface PeriodPickerProps {
  preset: string;
  onPresetChange: (preset: string) => void;
  allowCustom?: boolean;
  range?: [Dayjs, Dayjs] | null;
  onRangeChange?: (range: [Dayjs, Dayjs] | null) => void;
}

/** Date-range control shared by the dashboard and analytics pages. */
export function PeriodPicker({
  preset,
  onPresetChange,
  allowCustom = false,
  range,
  onRangeChange,
}: PeriodPickerProps) {
  const options = allowCustom ? [...PRESETS, { value: 'custom', label: 'Custom' }] : PRESETS;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        aria-label="Period"
        value={preset}
        onChange={(value) => onPresetChange(String(value))}
        options={options}
      />
      {allowCustom && preset === 'custom' ? (
        <DatePicker.RangePicker
          value={range ?? null}
          onChange={(value) => onRangeChange?.(value as [Dayjs, Dayjs] | null)}
        />
      ) : null}
    </div>
  );
}
