import { memo, useEffect, useRef } from 'react';
import { observeInView, REVEAL_CLASS } from '../utils/inView';

function Reveal({ as: Tag = 'div', delay = 0, className = '', children }) {
  const ref = useRef(null);
  useEffect(() => observeInView(ref.current), []);

  return (
    <Tag
      ref={ref}
      className={`${REVEAL_CLASS} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

export default memo(Reveal);
