interface TuvSudLogoProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function TuvSudLogo({ size = 42, className, style }: TuvSudLogoProps) {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src="/images/logo-tuv.svg"
      alt="TÜV SÜD Logo Oficial"
      width={pixelSize}
      height={pixelSize}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        userSelect: 'none',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

