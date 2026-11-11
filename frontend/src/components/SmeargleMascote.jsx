import { useEffect } from 'react';

const EMBED_SRC = 'https://tenor.com/embed.js';
const MASCOT_VISIBLE = '(min-width: 768px)';

export default function SmeargleMascote({ className }) {
  // O embed do Tenor é um script de terceiros pesado: só é carregado (uma vez) onde o mascote aparece.
  useEffect(() => {
    const media = window.matchMedia(MASCOT_VISIBLE);
    const loadEmbed = () => {
      if (!media.matches || document.querySelector(`script[src="${EMBED_SRC}"]`)) return;
      const script = document.createElement('script');
      script.async = true;
      script.src = EMBED_SRC;
      document.head.appendChild(script);
    };
    loadEmbed();
    media.addEventListener('change', loadEmbed);
    return () => media.removeEventListener('change', loadEmbed);
  }, []);

  return (
    <div className={`relative inline-block cursor-pointer ${className}`}>
      <div className="relative pointer-events-auto group" style={{ animation: 'float 7s ease-in-out infinite' }}>
        <div className="relative inline-block">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-black/10 rounded-full blur-sm" />
          <div className="relative w-16 h-16 rounded-full bg-[#F4F1EA] border-2 border-[#785132]/20 overflow-hidden flex items-center justify-center">
            <div className="tenor-gif-embed w-full h-full object-cover scale-125" data-postid="20177355" data-share-method="host" data-aspect-ratio="1.20755" data-width="100%">
              <a href="https://tenor.com/view/pokemon-smeargle-shiny-gif-20177355">Pokemon Smeargle Sticker</a>{' '}
              from <a href="https://tenor.com/search/pokemon-stickers">Pokemon Stickers</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
