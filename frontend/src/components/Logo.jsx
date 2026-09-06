import logoMark from '../assets/Logo-512.png';

export default function Logo({ className = 'w-9 h-9 rounded-lg', alt = 'ServeGo logo' }) {
  return (
    <img
      src={logoMark}
      alt={alt}
      draggable={false}
      className={`object-cover object-center shrink-0 ${className}`}
    />
  );
}