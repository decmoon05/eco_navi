import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Location, TransportMode } from '../types';
import { tmapSearchPlace } from '../services/tmap';

interface RouteFormProps {
  onRouteSubmit: (origin: Location, destination: Location, mode: TransportMode, isAcOn: boolean) => void;
  onPickOrigin?: (loc: Location) => void;
  onPickDestination?: (loc: Location) => void;
  isAcOn: boolean;
  onAcChange: (isOn: boolean) => void;
}

const FormContainer = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const FormTitle = styled.h2`
  color: #333;
  margin-bottom: 20px;
  font-size: 1.5rem;
`;

const InputGroup = styled.div`
  margin-bottom: 15px;
  position: relative; /* For positioning SuggestList */
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #555;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);

  &:focus {
    outline: none;
    border-color: #764ba2;
    box-shadow: 0 0 0 3px rgba(118, 75, 162, 0.2);
  }
`;

const SuggestList = styled.ul`
  position: absolute;
  width: 100%;
  background: white;
  list-style: none;
  margin-top: 8px;
  padding: 0;
  border: 1px solid #eee;
  border-radius: 8px;
  max-height: 160px;
  overflow-y: auto;
  z-index: 10;
`;

const SuggestItem = styled.li`
  padding: 8px 10px;
  cursor: pointer;
  color: #333; /* Set text color to be visible */

  &:hover {
    background: #f7faff;
  }
`;

const Hint = styled.div`
  font-size: 12px;
  color: #777;
  margin-top: 8px;
`;

const TransportModeContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
`;

const TransportModeButton = styled.button<{ selected: boolean }>`
  padding: 12px;
  border: 2px solid ${props => props.selected ? '#2196F3' : '#e0e0e0'};
  border-radius: 8px;
  background: ${props => props.selected ? '#2196F3' : 'white'};
  color: ${props => props.selected ? 'white' : '#333'};
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;

  &:hover {
    border-color: #2196F3;
    background: ${props => props.selected ? '#2196F3' : '#f0f8ff'};
  }
`;

const OptionsContainer = styled.div`
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 10px rgba(0,0,0,0.15);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const RouteForm: React.FC<RouteFormProps> = ({ onRouteSubmit, onPickOrigin, onPickDestination, isAcOn, onAcChange }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedMode, setSelectedMode] = useState<TransportMode>('car');
  const [originSuggest, setOriginSuggest] = useState<Location[]>([]);
  const [destSuggest, setDestSuggest] = useState<Location[]>([]);
  const [pickedOrigin, setPickedOrigin] = useState<Location | null>(null);
  const [pickedDestination, setPickedDestination] = useState<Location | null>(null);
  const appKeyPresent = Boolean(process.env.REACT_APP_TMAP_APP_KEY);

  const debouncedOrigin = useDebounce(origin, 500);
  const debouncedDestination = useDebounce(destination, 500);

  useEffect(() => {
    if (pickedOrigin) return;
    let alive = true;
    const fetchS = async () => {
      const q = debouncedOrigin.trim();
      if (q.length < 2) { setOriginSuggest([]); return; }
      if (!appKeyPresent) { setOriginSuggest([]); return; }
      try {
        const list = await tmapSearchPlace(q);
        if (alive) { setOriginSuggest(list); }
      } catch { if (alive) setOriginSuggest([]); }
    };
    if (debouncedOrigin) fetchS();
    else setOriginSuggest([]);
    return () => { alive = false; };
  }, [debouncedOrigin, appKeyPresent, pickedOrigin]);

  useEffect(() => {
    if (pickedDestination) return;
    let alive = true;
    const fetchS = async () => {
      const q = debouncedDestination.trim();
      if (q.length < 2) { setDestSuggest([]); return; }
      if (!appKeyPresent) { setDestSuggest([]); return; }
      try {
        const list = await tmapSearchPlace(q);
        if (alive) { setDestSuggest(list); }
      } catch { if (alive) setDestSuggest([]); }
    };
    if (debouncedDestination) fetchS();
    else setDestSuggest([]);
    return () => { alive = false; };
  }, [debouncedDestination, appKeyPresent, pickedDestination]);

  const transportModes: { mode: TransportMode; icon: string; name: string }[] = [
    { mode: 'walking', icon: '🚶', name: '도보' },
    { mode: 'bicycle', icon: '🚲', name: '자전거' },
    { mode: 'bus', icon: '🚌', name: '버스' },
    { mode: 'subway', icon: '🚇', name: '지하철' },
    { mode: 'car', icon: '🚗', name: '자동차' },
    { mode: 'electric_car', icon: '🔋', name: '전기차' },
  ];

  const autoSubmitIfReady = (mode: TransportMode) => {
    if (pickedOrigin && pickedDestination) {
      onRouteSubmit(pickedOrigin, pickedDestination, mode, isAcOn);
    }
  };

  const pickOrigin = (s: Location) => {
    setOrigin(s.name);
    setPickedOrigin(s);
    onPickOrigin && onPickOrigin(s);
    setOriginSuggest([]);
    if (pickedDestination) autoSubmitIfReady(selectedMode);
  };

  const pickDestination = (s: Location) => {
    setDestination(s.name);
    setPickedDestination(s);
    onPickDestination && onPickDestination(s);
    setDestSuggest([]);
    if (pickedOrigin) autoSubmitIfReady(selectedMode);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickedOrigin || !pickedDestination) {
      alert("출발지와 목적지를 목록에서 선택해주세요.");
      return;
    }
    onRouteSubmit(pickedOrigin, pickedDestination, selectedMode, isAcOn);
  };

  return (
    <FormContainer>
      <FormTitle>경로 검색</FormTitle>
      <form onSubmit={handleSubmit}>
        <InputGroup>
          <Label>출발지</Label>
          <Input type="text" value={origin} onChange={(e) => { setOrigin(e.target.value); setPickedOrigin(null); }} placeholder="출발지를 입력하세요" required />
          {originSuggest.length > 0 && (
            <SuggestList>
              {originSuggest.map((s, i) => (
                <SuggestItem key={i} onClick={() => pickOrigin(s)}>{s.name}</SuggestItem>
              ))}
            </SuggestList>
          )}
        </InputGroup>

        <InputGroup>
          <Label>도착지</Label>
          <Input type="text" value={destination} onChange={(e) => { setDestination(e.target.value); setPickedDestination(null); }} placeholder="도착지를 입력하세요" required />
          {destSuggest.length > 0 && (
            <SuggestList>
              {destSuggest.map((s, i) => (
                <SuggestItem key={i} onClick={() => pickDestination(s)}>{s.name}</SuggestItem>
              ))}
            </SuggestList>
          )}
          {!appKeyPresent && (
            <Hint>정확한 장소 검색과 도로망 경로를 위해 Tmap APP KEY를 설정하세요: <code>REACT_APP_TMAP_APP_KEY</code></Hint>
          )}
        </InputGroup>

        <InputGroup>
          <Label>이동 수단</Label>
          <TransportModeContainer>
            {transportModes.map(({ mode, icon, name }) => (
              <TransportModeButton
                key={mode}
                type="button"
                selected={selectedMode === mode}
                onClick={() => { setSelectedMode(mode); autoSubmitIfReady(mode); }}
              >
                <span style={{ fontSize: '20px' }}>{icon}</span>
                <span>{name}</span>
              </TransportModeButton>
            ))}
          </TransportModeContainer>
        </InputGroup>

        <OptionsContainer>
          <Label htmlFor="ac-checkbox" style={{ marginBottom: 0, cursor: 'pointer' }}>❄️🔥 에어컨/히터 사용</Label>
          <input 
            type="checkbox" 
            id="ac-checkbox"
            checked={isAcOn}
            onChange={(e) => onAcChange(e.target.checked)}
            style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
          />
        </OptionsContainer>

        <SubmitButton type="submit" disabled={!pickedOrigin || !pickedDestination}>
          경로 검색하기
        </SubmitButton>
      </form>
    </FormContainer>
  );
};

export default RouteForm; 