import { useState, useCallback, useEffect, useRef } from 'react';
import {
    GAME_DATA,
    EVENTS,
    calculateTurn,
    calculatePurchasePrice,
    RegionType,
    OwnershipType,
    RenovationLevel,
    MarketingLevel,
    StaffLevel,
    TurnResult
} from '../lib/gameLogic';

export const useGame = () => {
    // Load initial state from LocalStorage
    const loadState = () => {
        const saved = localStorage.getItem('hotel-tycoon-save');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return {
                    ...parsed,
                    lastResult: null // Don't persist last result to avoid complex serialization
                };
            } catch (e) {
                console.error('Failed to parse save', e);
            }
        }
        return null;
    };

    const initial = loadState();

    const [balance, setBalance] = useState(initial?.balance ?? 1000000);
    const [currentTurn, setCurrentTurn] = useState(initial?.currentTurn ?? 1);
    const [currentMonth, setCurrentMonth] = useState(initial?.currentMonth ?? 1);
    const [region, setRegion] = useState<RegionType>(initial?.region ?? 'Taksim');
    const [segmentIndex, setSegmentIndex] = useState(initial?.segmentIndex ?? 0);
    const [priceSlider, setPriceSlider] = useState(initial?.priceSlider ?? 1.0);
    const [ownership, setOwnership] = useState<OwnershipType>(initial?.ownership ?? 'Rent');
    const [renovation, setRenovation] = useState<RenovationLevel>(initial?.renovation ?? 'None');
    const [marketing, setMarketing] = useState<MarketingLevel>(initial?.marketing ?? 'None');
    const [staffing, setStaffing] = useState<StaffLevel>(initial?.staffing ?? 'Balanced');
    const [reputation, setReputation] = useState(initial?.reputation ?? 50);
    const [turnsLeftOnReno, setTurnsLeftOnReno] = useState(initial?.turnsLeftOnReno ?? 0);
    const [activeEvents, setActiveEvents] = useState<{ id: string, turnsLeft: number }[]>(initial?.activeEvents ?? []);
    const [lastResult, setLastResult] = useState<TurnResult | null>(null);

    // Automation State
    const [isIdleMode, setIsIdleMode] = useState(false);
    const idleIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Persistence
    useEffect(() => {
        const stateToSave = {
            balance, currentTurn, currentMonth, region, segmentIndex,
            priceSlider, ownership, renovation, marketing, staffing,
            reputation, turnsLeftOnReno, activeEvents
        };
        localStorage.setItem('hotel-tycoon-save', JSON.stringify(stateToSave));
    }, [balance, currentTurn, currentMonth, region, segmentIndex, priceSlider, ownership, renovation, marketing, staffing, reputation, turnsLeftOnReno, activeEvents]);

    const endTurn = useCallback(() => {
        // 1. Calculate Results
        const result = calculateTurn(
            region,
            segmentIndex,
            currentMonth,
            priceSlider,
            ownership,
            renovation,
            turnsLeftOnReno,
            marketing,
            staffing,
            activeEvents,
            reputation
        );

        // 2. Update State
        if (result.isRenovating) {
            setTurnsLeftOnReno(prev => prev - 1);
        } else {
            setBalance(prev => prev + (result.revenue - result.expense));
            setReputation(prev => Math.max(0, Math.min(100, prev + result.reputationChange)));
        }

        // 3. Manage Events (Tick down durations)
        const nextEvents = activeEvents
            .map(ae => ({ ...ae, turnsLeft: ae.turnsLeft - 1 }))
            .filter(ae => ae.turnsLeft > 0);

        // 4. Random Event Generation (5% chance per turn)
        if (Math.random() < 0.05 && nextEvents.length === 0) {
            const randomEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];
            nextEvents.push({ id: randomEvent.id, turnsLeft: randomEvent.duration });
        }
        setActiveEvents(nextEvents);

        setLastResult(result);
        setCurrentTurn(prev => {
            const next = prev + 1;
            // 30 turns = 1 month
            if (next % 30 === 0) {
                setCurrentMonth(m => (m % 12) + 1);
            }
            return next;
        });
    }, [region, segmentIndex, currentMonth, priceSlider, ownership, renovation, turnsLeftOnReno, marketing, staffing, activeEvents, reputation]);

    // Idle Mode Logic
    useEffect(() => {
        if (isIdleMode) {
            idleIntervalRef.current = setInterval(() => {
                endTurn();
            }, 3000); // Progress every 3 seconds
        } else {
            if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
        }
        return () => {
            if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
        }
    }, [isIdleMode, endTurn]);

    const buyHotel = useCallback(() => {
        const price = calculatePurchasePrice(region, segmentIndex);
        if (balance >= price && ownership === 'Rent') {
            setBalance(prev => prev - price);
            setOwnership('Own');
            return true;
        }
        return false;
    }, [balance, region, segmentIndex, ownership]);

    const upgradeSegment = useCallback(() => {
        const nextIndex = segmentIndex + 1;
        if (nextIndex >= GAME_DATA.segments.length) return false;

        if (nextIndex > 2 && reputation < 70) {
            alert("İtibarınız çok düşük! Segment yükseltmek için en az %70 itibar gerekiyor.");
            return false;
        }

        const upgradeCost = calculatePurchasePrice(region, nextIndex) * 0.2;
        if (balance >= upgradeCost) {
            setBalance(prev => prev - upgradeCost);
            setSegmentIndex(nextIndex);
            return true;
        }
        return false;
    }, [balance, region, segmentIndex, reputation]);

    const startRenovation = useCallback((level: RenovationLevel) => {
        if (turnsLeftOnReno > 0) return false;

        const data = GAME_DATA.renovations[level];
        const purchasePrice = calculatePurchasePrice(region, segmentIndex);
        const cost = purchasePrice * data.costPercent;

        if (balance >= cost) {
            setBalance(prev => prev - cost);
            setRenovation(level);
            setTurnsLeftOnReno(data.turnsToComplete);
            return true;
        }
        return false;
    }, [balance, region, segmentIndex, turnsLeftOnReno]);

    const resetGame = () => {
        localStorage.removeItem('hotel-tycoon-save');
        window.location.reload();
    };

    return {
        state: {
            balance,
            currentTurn,
            currentMonth,
            region,
            segmentIndex,
            priceSlider,
            ownership,
            renovation,
            marketing,
            staffing,
            reputation,
            turnsLeftOnReno,
            activeEvents,
            lastResult,
            isIdleMode
        },
        actions: {
            setPriceSlider,
            setRegion,
            setMarketing,
            setStaffing,
            setIsIdleMode,
            endTurn,
            buyHotel,
            upgradeSegment,
            startRenovation,
            resetGame
        }
    };
};
