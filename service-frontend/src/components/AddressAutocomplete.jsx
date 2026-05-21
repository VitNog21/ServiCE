import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 500;

function AddressAutocomplete({ value, onChange, onAddressSelect, disabled = false, required = false }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const rootRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const query = value?.trim() ?? '';

    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      setHighlightedIndex(-1);
      setError('');
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError('');

        const params = new URLSearchParams({
          format: 'json',
          q: query,
          addressdetails: '1',
          limit: '5',
        });

        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Falha ao buscar enderecos.');
        }

        const data = await response.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setHighlightedIndex(-1);
        setIsOpen(true);
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setError('Nao foi possivel carregar sugestoes agora.');
          setSuggestions([]);
          setHighlightedIndex(-1);
          setIsOpen(true);
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [value]);

  const handleSelect = (item) => {
    const selectedAddress = item.display_name;
    const selectedLat = Number(item.lat);
    const selectedLon = Number(item.lon);

    onChange(selectedAddress);
    onAddressSelect({
      display_name: selectedAddress,
      lat: selectedLat,
      lon: selectedLon,
    });

    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleInputKeyDown = (event) => {
    if (!isOpen || suggestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <Input
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setError('');
        }}
        onKeyDown={handleInputKeyDown}
        placeholder="Digite rua, bairro ou cidade"
        autoComplete="off"
        disabled={disabled}
        required={required}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="address-autocomplete-list"
        aria-autocomplete="list"
      />

      {isOpen && (
        <div
          id="address-autocomplete-list"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
        >
          {isLoading && (
            <div className="px-3 py-2 text-sm text-slate-500">Buscando enderecos...</div>
          )}

          {!isLoading && error && (
            <div className="px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          {!isLoading && !error && suggestions.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">Nenhum endereco encontrado.</div>
          )}

          {!isLoading && !error && suggestions.map((item, index) => {
            const isHighlighted = index === highlightedIndex;

            return (
              <button
                key={`${item.place_id}-${item.lat}-${item.lon}`}
                type="button"
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelect(item)}
                className={`block w-full border-b border-slate-100 px-3 py-2 text-left text-sm transition-colors ${
                  isHighlighted ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.display_name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;
