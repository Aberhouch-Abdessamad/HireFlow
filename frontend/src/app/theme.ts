import type { ThemeConfig } from 'antd';

/**
 * HireFlow design tokens (job-board style: one confident blue on warm greys). The same values are declared for
 * Tailwind in src/index.css (@theme). Change both places together.
 */
export const colors = {
  primary: '#2557A7',
  primaryHover: '#164081',
  primarySoft: '#EEF3FC',
  dark: '#2D2D2D',
  background: '#F3F2F1',
  surface: '#FFFFFF',
  border: '#E4E2E0',
  borderSoft: '#EFEDEB',
  text: '#2D2D2D',
  muted: '#595959',
  success: '#1F662C',
  warning: '#B35B00',
  danger: '#A9252B',
} as const;

/** Ordered chart palette (validated with the dataviz palette checker; charts always ship legends). */
export const chartColors = [
  '#2557A7',
  '#E8833A',
  '#1A9E77',
  '#C0398A',
  '#7A5CC2',
  '#0B8EC4',
] as const;

export const fontFamily =
  "'Inter Variable', Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const antdTheme: ThemeConfig = {
  cssVar: { key: 'hireflow' },
  hashed: false,
  token: {
    colorPrimary: colors.primary,
    colorInfo: colors.primary,
    colorLink: colors.primary,
    colorLinkHover: colors.primaryHover,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.danger,
    colorText: colors.text,
    colorTextSecondary: colors.muted,
    colorTextDescription: colors.muted,
    colorBorder: '#949494',
    colorBorderSecondary: colors.borderSoft,
    colorSplit: colors.borderSoft,
    colorBgLayout: colors.background,
    colorBgContainer: colors.surface,
    fontFamily,
    fontSize: 14,
    borderRadius: 8,
    borderRadiusLG: 12,
    fontWeightStrong: 700,
    borderRadiusSM: 6,
    controlHeight: 40,
    boxShadow: '0 8px 24px -6px rgb(15 23 42 / 0.12), 0 2px 6px -2px rgb(15 23 42 / 0.06)',
    boxShadowSecondary:
      '0 12px 32px -8px rgb(15 23 42 / 0.16), 0 2px 8px -2px rgb(15 23 42 / 0.08)',
  },
  components: {
    Layout: {
      siderBg: colors.surface,
      headerBg: '#FFFFFF',
      bodyBg: colors.background,
      headerPadding: '0 24px',
      headerHeight: 60,
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: '#424242',
      itemHoverColor: colors.text,
      itemHoverBg: '#F3F2F1',
      itemSelectedBg: colors.primarySoft,
      itemSelectedColor: colors.primary,
      itemHeight: 36,
      itemMarginInline: 10,
      itemBorderRadius: 8,
      iconSize: 16,
      groupTitleColor: '#6F6F6F',
      groupTitleFontSize: 11,
      activeBarBorderWidth: 0,
    },
    Card: {
      borderRadiusLG: 14,
      headerFontSize: 15,
      headerHeight: 52,
    },
    Table: {
      headerBg: '#FAF9F8',
      headerColor: colors.muted,
      headerSplitColor: 'transparent',
      rowHoverBg: '#F7F9FD',
      cellPaddingBlock: 14,
      borderColor: colors.borderSoft,
    },
    Button: {
      fontWeight: 700,
      primaryShadow: 'none',
      defaultShadow: 'none',
      defaultBorderColor: '#949494',
      defaultColor: colors.primary,
    },
    Input: {
      activeShadow: '0 0 0 2px #B9CDF0',
    },
    Select: {
      activeOutlineColor: '#B9CDF0',
    },
    Tabs: {
      itemColor: colors.muted,
      titleFontSize: 14,
    },
    Tag: {
      defaultBg: '#F3F2F1',
    },
    Modal: {
      borderRadiusLG: 16,
    },
    Segmented: {
      itemSelectedBg: colors.surface,
      trackBg: '#E4E2E0',
    },
  },
};
