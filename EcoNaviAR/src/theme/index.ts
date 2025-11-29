/**
 * 통합 테마 파일
 */

export { Colors } from './colors';
export { Typography } from './typography';
export { Spacing } from './spacing';
export { Shadows } from './shadows';

import { Colors } from './colors';
import { Typography } from './typography';
import { Spacing } from './spacing';
import { Shadows } from './shadows';

export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  shadows: Shadows,
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 24,
    round: 9999,
  },
} as const;



