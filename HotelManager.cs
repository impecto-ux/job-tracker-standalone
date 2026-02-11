using System;
using System.Collections.Generic;
using UnityEngine;

namespace HotelTycoon.Core
{
    // --- UNITY COMPONENT ---

    public class HotelManager : MonoBehaviour
    {
        [Header("Player State")]
        public double Balance = 1000000;
        public int CurrentTurn = 1;
        public int CurrentMonth = 1;

        [Header("Hotel Config")]
        public RegionType SelectedRegion = RegionType.Taksim;
        public int CurrentSegmentIndex = 0; // 0=Hostel, 1=Apart, etc.
        public float PriceSlider = 1.0f;
        
        [Header("Ownership & Renovation")]
        public OwnershipType OwnershipStatus = OwnershipType.Rent;
        public RenovationLevel CurrentRenovation = RenovationLevel.None;
        public int TurnsUntilRenovationComplete = 0;

        // UI Reference Data
        public TurnResult LastTurnResult { get; private set; }

        public void EndTurn()
        {
            // 1. Calculate the physics/economy of the turn
            LastTurnResult = EconomyCalculator.CalculateTurn(
                SelectedRegion, 
                CurrentSegmentIndex, 
                CurrentMonth, 
                PriceSlider, 
                OwnershipStatus, 
                CurrentRenovation, 
                TurnsUntilRenovationComplete);

            // 2. Apply results
            if (LastTurnResult.IsRenovating)
            {
                TurnsUntilRenovationComplete--;
            }
            else
            {
                Balance += (LastTurnResult.Revenue - LastTurnResult.Expense);
            }

            // 3. Advance Time
            // In our simple model: 1 day = 1 turn. 30 turns = 1 month.
            CurrentTurn++;
            if (CurrentTurn % 30 == 0)
            {
                CurrentMonth = (CurrentMonth % 12) + 1;
            }
        }

        public void BuyHotel()
        {
            float price = EconomyCalculator.CalculatePurchasePrice(SelectedRegion, CurrentSegmentIndex);
            if (Balance >= price && OwnershipStatus == OwnershipType.Rent)
            {
                Balance -= price;
                OwnershipStatus = OwnershipType.Own;
                Debug.Log($"Mülk Satın Alındı! Ödenen: {price:N0} ₺");
            }
        }

        public void UpgradeSegment()
        {
            int nextIndex = CurrentSegmentIndex + 1;
            if (nextIndex >= GameData.Segments.Count) return;

            // Simplified upgrade cost: 5x the Purchase Price of the new segment level
            float upgradeCost = EconomyCalculator.CalculatePurchasePrice(SelectedRegion, nextIndex) * 0.2f;

            if (Balance >= upgradeCost)
            {
                Balance -= upgradeCost;
                CurrentSegmentIndex = nextIndex;
                Debug.Log($"Segment Yükseltildi: {GameData.Segments[nextIndex].Name}");
            }
        }

        public void StartRenovation(RenovationLevel level)
        {
            if (TurnsUntilRenovationComplete > 0) return;

            RenovationData data = GameData.Renovations[level];
            float purchasePrice = EconomyCalculator.CalculatePurchasePrice(SelectedRegion, CurrentSegmentIndex);
            float cost = purchasePrice * data.CostPercent;

            if (Balance >= cost)
            {
                Balance -= cost;
                CurrentRenovation = level;
                TurnsUntilRenovationComplete = data.TurnsToComplete;
            }
        }
    }
}
