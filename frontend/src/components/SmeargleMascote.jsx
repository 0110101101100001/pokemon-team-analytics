import { useEffect } from 'react';

export default function SmeargleMascote({ className }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://tenor.com/embed.js';
    document.head.appendChild(script);
    return () => {};
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
