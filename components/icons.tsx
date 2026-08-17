import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7 };

export function MarkIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M4 4h16v16H4z"/><path d="m8 15 4-7 4 7M9.5 13h5"/></svg>;
}

export function UploadIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M5 14v5h14v-5"/></svg>;
}

export function FileIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 13h6M9 17h4"/></svg>;
}

export function SearchIcon(props: IconProps) {
  return <svg {...base} {...props}><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>;
}

export function ArrowIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M5 12h13m-5-5 5 5-5 5"/></svg>;
}

export function CheckIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m5 12 4 4L19 6"/></svg>;
}

export function SparkIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m12 2 1.4 5.1L18 9l-4.6 1.9L12 16l-1.4-5.1L6 9l4.6-1.9z"/><path d="m18.5 15 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z"/></svg>;
}
