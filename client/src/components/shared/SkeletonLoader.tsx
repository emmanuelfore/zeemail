
interface SkeletonLoaderProps {
  width?: string;
  height?: string;
  borderRadius?: string;
}

export function SkeletonLoader({ width = '100%', height = '1rem', borderRadius = '4px' }: SkeletonLoaderProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius }}
    />
  );
}
