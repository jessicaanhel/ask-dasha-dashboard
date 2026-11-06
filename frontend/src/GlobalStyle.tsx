import { Global, css } from '@emotion/react';
import { COLORS, FONT } from './theme/tokens';

export const GlobalStyle = () => (
  <Global
    styles={css`
      :root {
        color-scheme: light;
      }
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        font-family: ${FONT};
        background-color: ${COLORS.background};
        color: ${COLORS.textPrimary};
      }
      a {
        color: inherit;
        text-decoration: none;
      }
      ::selection {
        background: rgba(74, 108, 247, 0.25);
      }
    `}
  />
);
