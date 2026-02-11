export type RegionType = 'Taksim' | 'Sultanahmet' | 'Besiktas';
export type OwnershipType = 'Rent' | 'Own';
export type RenovationLevel = 'None' | 'Light' | 'Medium' | 'Heavy';
export type MarketingLevel = 'None' | 'SocialMedia' | 'Influencer' | 'TV';
export type StaffLevel = 'Minimum' | 'Balanced' | 'Premium';

export type GuestType = 'Business' | 'Tourist' | 'Budget';

export interface GuestDecision {
    type: GuestType;
    accepted: boolean;
    reason?: string;
}

export interface GameEvent {
    id: string;
    name: string;
    description: string;
    demandImpact: number;
    duration: number; // in turns
}

export interface TurnResult {
    realPrice: number;
    occupancy: number;
    revenue: number;
    expense: number;
    occupiedRooms: number;
    isRenovating: boolean;
    eventImpact?: number;
    reputationChange: number;
    guestDecisions: GuestDecision[];
}

export const GAME_DATA = {
    regions: {
        Taksim: { name: 'Taksim', priceMultiplier: 1.0, demandMultiplier: 1.0, rentMultiplier: 1.0, buyMultiplier: 1.0 },
        Sultanahmet: { name: 'Sultanahmet', priceMultiplier: 0.95, demandMultiplier: 1.05, rentMultiplier: 1.05, buyMultiplier: 1.05 },
        Besiktas: { name: 'Beşiktaş', priceMultiplier: 1.1, demandMultiplier: 0.95, rentMultiplier: 1.15, buyMultiplier: 1.15 },
    },
    segments: [
        { name: 'Hostel', baseADR: 1200, baseOccupancy: 55, roomCount: 20, rentPerRoom: 8000, buyPerRoom: 1200000 },
        { name: 'Apart', baseADR: 1700, baseOccupancy: 60, roomCount: 15, rentPerRoom: 11000, buyPerRoom: 1500000 },
        { name: 'Butik', baseADR: 2300, baseOccupancy: 58, roomCount: 12, rentPerRoom: 14000, buyPerRoom: 1800000 },
        { name: '3 Yıldızlı', baseADR: 2700, baseOccupancy: 62, roomCount: 40, rentPerRoom: 18000, buyPerRoom: 2400000 },
        { name: '4 Yıldızlı', baseADR: 3600, baseOccupancy: 65, roomCount: 60, rentPerRoom: 26000, buyPerRoom: 3400000 },
        { name: '5 Yıldızlı', baseADR: 8500, baseOccupancy: 68, roomCount: 100, rentPerRoom: 55000, buyPerRoom: 6500000 },
    ],
    renovations: {
        None: { level: 'None', turnsToComplete: 0, costPercent: 0, adrBonus: 0, demandBonus: 0, maintenanceBonus: 0 },
        Light: { level: 'Light', turnsToComplete: 1, costPercent: 0.03, adrBonus: 0.05, demandBonus: 0.02, maintenanceBonus: 0 },
        Medium: { level: 'Medium', turnsToComplete: 2, costPercent: 0.07, adrBonus: 0.12, demandBonus: 0.05, maintenanceBonus: 0 },
        Heavy: { level: 'Heavy', turnsToComplete: 4, costPercent: 0.15, adrBonus: 0.25, demandBonus: 0.1, maintenanceBonus: -0.1 },
    },
    marketing: {
        None: { cost: 0, demandBonus: 0 },
        SocialMedia: { cost: 500, demandBonus: 0.08 },
        Influencer: { cost: 1500, demandBonus: 0.18 },
        TV: { cost: 5000, demandBonus: 0.35 },
    },
    staffing: {
        Minimum: { costPerRoom: 50, reputationImpact: -1.5, demandImpact: -0.05 },
        Balanced: { costPerRoom: 150, reputationImpact: 0.2, demandImpact: 0 },
        Premium: { costPerRoom: 400, reputationImpact: 1.0, demandImpact: 0.1 },
    },
    monthlyMultipliers: [0.80, 0.85, 0.90, 1.00, 1.05, 1.10, 1.20, 1.20, 1.15, 1.10, 0.95, 0.90],
};

export const EVENTS: GameEvent[] = [
    { id: 'conf', name: 'Uluslararası Konferans', description: 'Şehirde dev bir teknoloji konferansı var!', demandImpact: 0.25, duration: 3 },
    { id: 'match', name: 'Derbi Günü', description: 'Beşiktaş-Galatasaray maçı nedeniyle talep arttı!', demandImpact: 0.4, duration: 1 },
    { id: 'rain', name: 'Sağanak Yağış', description: 'Hafta boyu yağış bekleniyor, turistler otelde kalıyor.', demandImpact: -0.1, duration: 2 },
    { id: 'bad_review', name: 'Kötü Viral Yorum', description: 'Bir influencer yemeği beğenmedi!', demandImpact: -0.2, duration: 4 },
];

export const calculateTurn = (
    region: RegionType,
    segmentIndex: number,
    month: number,
    priceSlider: number,
    ownership: OwnershipType,
    renoLevel: RenovationLevel,
    turnsLeftOnReno: number,
    marketing: MarketingLevel,
    staffing: StaffLevel,
    activeEvents: { id: string, turnsLeft: number }[],
    reputation: number
): TurnResult => {
    if (turnsLeftOnReno > 0) {
        return { realPrice: 0, occupancy: 0, revenue: 0, expense: 0, occupiedRooms: 0, isRenovating: true, reputationChange: 0, guestDecisions: [] };
    }

    const regionData = GAME_DATA.regions[region];
    const segmentData = GAME_DATA.segments[segmentIndex];
    const renoData = GAME_DATA.renovations[renoLevel];
    const marketingData = GAME_DATA.marketing[marketing];
    const staffingData = GAME_DATA.staffing[staffing];
    const seasonMultiplier = GAME_DATA.monthlyMultipliers[month - 1];

    // 1. Calculate Real Price (BaseADR * RegionPrice * Season * Slider * RenoBonus)
    const realPrice = segmentData.baseADR * regionData.priceMultiplier * seasonMultiplier * priceSlider * (1.0 + renoData.adrBonus);

    // 2. Price Deviation Impact (STRICT FORMULA FROM INITIAL PROMPT)
    // +10% price -> -6 points occupancy
    // -10% price -> +4 points occupancy
    const priceDeviationPercent = (priceSlider - 1.0) * 100;
    let occupancyPriceImpact = 0;
    if (priceDeviationPercent > 0) {
        occupancyPriceImpact = -(priceDeviationPercent / 10) * 6;
    } else {
        occupancyPriceImpact = -(priceDeviationPercent / 10) * 4;
    }

    // 3. Event Impact
    const totalEventImpact = activeEvents.reduce((acc, ae) => {
        const event = EVENTS.find(e => e.id === ae.id);
        return acc + (event?.demandImpact || 0);
    }, 0);

    // 4. Calculate TARGET Occupancy
    const baseOccupancy = segmentData.baseOccupancy * regionData.demandMultiplier * seasonMultiplier;
    let targetOccupancy = baseOccupancy
        + occupancyPriceImpact
        + (baseOccupancy * (totalEventImpact + marketingData.demandBonus + (reputation - 50) / 500 + staffingData.demandImpact + renoData.demandBonus));

    targetOccupancy = Math.max(5, Math.min(98, targetOccupancy));

    // 5. Simulation: Guest Arrivals (Visually match the Target Occupancy)
    const guestTypes: GuestType[] = ['Business', 'Tourist', 'Budget'];
    const decisions: GuestDecision[] = [];
    let occupiedRooms = 0;

    // Potential guests scale based on target occupancy to make simulation visually consistent
    const potentialGuestsCount = Math.round(segmentData.roomCount * (targetOccupancy / 100) * 1.2);

    for (let i = 0; i < potentialGuestsCount; i++) {
        if (occupiedRooms >= segmentData.roomCount) break;

        const type = guestTypes[Math.floor(Math.random() * guestTypes.length)];
        let accepted = Math.random() < (targetOccupancy / 100); // Simple probability check aligned with target

        let reason = "";
        if (!accepted) {
            if (priceSlider > 1.1) reason = "Çok pahalı.";
            else if (reputation < 50) reason = "Hizmet kalitesi şüpheli.";
            else reason = "Başka bir oteli tercih ettim.";
        }

        if (accepted && occupiedRooms < segmentData.roomCount) {
            occupiedRooms++;
        }

        if (decisions.length < 15) {
            decisions.push({ type, accepted, reason: accepted ? undefined : reason });
        }
    }

    // Final count check to ensure simulation doesn't stray too far from target calculation
    // (In a real game we might want jitter, but for "data sync" we want consistency)
    const finalOccupancy = (occupiedRooms / segmentData.roomCount) * 100;
    const revenue = occupiedRooms * realPrice;

    // 6. Expenses
    let baseExpense = 0;
    if (ownership === 'Rent') {
        baseExpense = (segmentData.roomCount * segmentData.rentPerRoom * regionData.rentMultiplier) / 30;
    } else {
        const mockRent = (segmentData.roomCount * segmentData.rentPerRoom * regionData.rentMultiplier) / 30;
        baseExpense = mockRent * 0.15 * (1.0 + renoData.maintenanceBonus);
    }

    const marketingExpense = marketingData.cost;
    const staffingExpense = segmentData.roomCount * staffingData.costPerRoom / 30;

    const totalExpense = baseExpense + marketingExpense + staffingExpense;

    return {
        realPrice,
        occupancy: finalOccupancy,
        revenue,
        expense: totalExpense,
        occupiedRooms,
        isRenovating: false,
        eventImpact: totalEventImpact,
        reputationChange: staffingData.reputationImpact + (finalOccupancy > 85 ? 0.3 : finalOccupancy < 30 ? -0.3 : 0),
        guestDecisions: decisions
    };
};

export const calculatePurchasePrice = (region: RegionType, segmentIndex: number): number => {
    const regionData = GAME_DATA.regions[region];
    const segmentData = GAME_DATA.segments[segmentIndex];
    return segmentData.roomCount * segmentData.buyPerRoom * regionData.buyMultiplier;
};
