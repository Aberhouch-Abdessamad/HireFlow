import { CalendarOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Segmented } from 'antd';
import { useNavigate } from 'react-router';

/** Toggle between the interview list and calendar pages. */
export function InterviewViewSwitch({ value }: { value: 'list' | 'calendar' }) {
  const navigate = useNavigate();
  return (
    <Segmented
      aria-label="Interview view"
      value={value}
      onChange={(next) =>
        void navigate(next === 'calendar' ? '/interviews/calendar' : '/interviews')
      }
      options={[
        { value: 'list', label: 'List', icon: <UnorderedListOutlined /> },
        { value: 'calendar', label: 'Calendar', icon: <CalendarOutlined /> },
      ]}
    />
  );
}
