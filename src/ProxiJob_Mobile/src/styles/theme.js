export const theme = {
  colors: {
    primary: '#FF6B00', // Premium Orange (accent for student role)
    secondary: '#0A58CA', // Premium Blue (accent for employer/enterprise role)
    student: '#FF6B00', // Premium Orange (student)
    employer: '#0A58CA', // Xanh Dương (employer)
    success: '#10B981', // Emerald Green (Check-in / Complete)
    danger: '#EF4444', // Red (Emergency / Reject)
    warning: '#F59E0B', // Amber Warning
    background: '#FFFFFF', // Bright background
    surface: '#F9FAFB', // Light card background
    surfaceSecondary: '#F3F4F6', // Darker light gray surface
    border: '#E5E7EB', // Fine border
    text: '#111827', // Slate Dark Gray for text (excellent contrast)
    textMuted: '#6B7280', // Medium Gray text
    textLight: '#9CA3AF', // Light Gray text
    white: '#FFFFFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 18,
    full: 9999,
  },
  shadows: {
    light: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
  },
  typography: {
    heading: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    subheading: {
      fontSize: 18,
      fontWeight: '600',
    },
    body: {
      fontSize: 14,
      fontWeight: 'normal',
    },
    caption: {
      fontSize: 12,
      fontWeight: '500',
    },
  }
};
