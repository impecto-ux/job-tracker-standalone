export const HEROES = {
    mage: {
        id: 'hero_mage',
        name: 'Ignis',
        role: 'DPS',
        description: 'Pyromancer Supreme',
        stats: {
            hp: 800,
            maxHp: 800,
            mana: 0,
            maxMana: 100
        },
        // Placeholder image until we generate assets
        image: 'https://placehold.co/400x600/300/FFF?text=Fire+Mage',
        color: '#c0392b'
    },
    tank: {
        id: 'hero_tank',
        name: 'Valdor',
        role: 'Tank',
        description: 'Shield of the Realm',
        stats: {
            hp: 1500,
            maxHp: 1500,
            mana: 0,
            maxMana: 80
        },
        image: 'https://placehold.co/400x600/203/FFF?text=Prot+Knight',
        color: '#2980b9'
    },
    healer: {
        id: 'hero_druid',
        name: 'Elara',
        role: 'Healer',
        description: 'Grove Keeper',
        stats: {
            hp: 1000,
            maxHp: 1000,
            mana: 0,
            maxMana: 120
        },
        image: 'https://placehold.co/400x600/276/FFF?text=Resto+Druid',
        color: '#27ae60'
    }
};
