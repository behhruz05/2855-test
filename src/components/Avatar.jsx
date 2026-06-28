import { avatarColor, initials } from '../lib/format';

export default function Avatar({ id, name, size = 'lg' }) {
  return (
    <div
      className={`avatar ${size === 'sm' ? 'sm' : ''}`}
      style={{ background: avatarColor(id) }}
    >
      {initials(name)}
    </div>
  );
}
