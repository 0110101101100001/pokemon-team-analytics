import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const CRIES_BASE = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest';
const CRY_VOLUME = 0.5;
const WAVE_DELAYS_MS = [0, 160, 320, 480];

function releaseAudio(audio) {
  audio.onended = null;
  audio.onerror = null;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
}

function PokemonCry({ pokemonId, criesUrl, label = 'Ouvir cry', className = '' }) {
  const src = criesUrl ?? (pokemonId ? `${CRIES_BASE}/${pokemonId}.ogg` : null);
  const audioRef = useRef(null);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    setStatus('idle');
    return () => {
      if (audioRef.current) releaseAudio(audioRef.current);
      audioRef.current = null;
    };
  }, [src]);

  const play = useCallback(() => {
    if (!src) return;

    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(src);
      audio.volume = CRY_VOLUME;
      audio.onended = () => setStatus('idle');
      audio.onerror = () => {
        releaseAudio(audio);
        audioRef.current = null;
        setStatus('error');
      };
      audioRef.current = audio;
    }

    audio.currentTime = 0;
    audio.play()
      .then(() => setStatus('playing'))
      .catch((err) => { if (err.name !== 'AbortError') setStatus('error'); });
  }, [src]);

  const playing = status === 'playing';
  const failed = status === 'error';
  const Icon = failed ? VolumeX : Volume2;

  return (
    <button
      type="button"
      onClick={play}
      disabled={!src}
      aria-label={failed ? `${label} (indisponível, tentar novamente)` : label}
      title={failed ? 'Cry indisponível' : label}
      className={`relative inline-flex items-center gap-2 h-9 pl-2.5 pr-3 rounded-full border transition-colors duration-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${
        playing
          ? 'bg-[#829b72] border-[#829b72] text-white shadow-sm'
          : 'bg-[#FFFEFB] border-[#4A3B32]/20 text-[#78614E] hover:border-[#829b72]/60 hover:text-[#2A2421]'
      } ${className}`}
    >
      {playing && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full border border-[#829b72] animate-cry-ring motion-reduce:animate-none"
        />
      )}
      <Icon className="w-4 h-4 shrink-0" />
      <span aria-hidden="true" className="flex items-center gap-[3px] h-3.5">
        {WAVE_DELAYS_MS.map((delay) => (
          <span
            key={delay}
            className={`w-[3px] h-full rounded-full bg-current transition-transform ${
              playing ? 'animate-cry-wave motion-reduce:animate-none' : 'scale-y-[0.35] opacity-60'
            }`}
            style={playing ? { animationDelay: `${delay}ms` } : undefined}
          />
        ))}
      </span>
    </button>
  );
}

export default memo(PokemonCry);
