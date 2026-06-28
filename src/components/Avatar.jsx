import { useEffect, useState } from 'react';
import { avatarColor, initials } from '../lib/format';
import { loadAvatar } from '../lib/api';

export default function Avatar({ id, name, size = 'lg', big = false }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    if (id) {
      loadAvatar(id, big).then((url) => {
        if (alive) setSrc(url);
      });
    }
    return () => {
      alive = false;
    };
  }, [id, big]);

  return (
    <div
      className={`avatar ${size === 'sm' ? 'sm' : ''}`}
      style={src ? undefined : { background: avatarColor(id) }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          onError={() => setSrc(null)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      ) : (
        initials(name)
      )}
    </div>
  );
}
