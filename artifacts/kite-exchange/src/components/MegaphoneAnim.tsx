import React from 'react';
import { Megaphone } from 'lucide-react';

export default function MegaphoneAnim({ size = 13 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', animation: 'megaflash 1.2s steps(1,end) infinite' }}>
      <Megaphone size={size} />
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: 10, height: size }}>
        <span style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          width: 6, height: 6, borderRadius: '50%',
          border: '1.5px solid currentColor',
          borderLeft: 'none', borderTop: 'none', borderBottom: 'none',
          animation: 'soundarc 1s ease-out 0s infinite',
        }} />
        <span style={{
          position: 'absolute', left: 2, top: '50%', transform: 'translateY(-50%)',
          width: 9, height: 9, borderRadius: '50%',
          border: '1.5px solid currentColor',
          borderLeft: 'none', borderTop: 'none', borderBottom: 'none',
          animation: 'soundarc 1s ease-out 0.35s infinite',
        }} />
        <span style={{
          position: 'absolute', left: 3, top: '50%', transform: 'translateY(-50%)',
          width: 13, height: 13, borderRadius: '50%',
          border: '1.5px solid currentColor',
          borderLeft: 'none', borderTop: 'none', borderBottom: 'none',
          animation: 'soundarc 1s ease-out 0.7s infinite',
        }} />
      </span>
    </span>
  );
}
