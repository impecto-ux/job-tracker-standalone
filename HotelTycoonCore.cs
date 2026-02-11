using System;
using System.Collections.Generic;
using UnityEngine;

namespace HotelTycoon.Core
{
    // --- ENUMS ---

    [Serializable]
    public enum RegionType { Taksim, Sultanahmet, Besiktas }

    [Serializable]
    public enum OwnershipType { Rent, Own }

    [Serializable]
    public enum RenovationLevel { None, Light, Medium, Heavy }

    // --- DATA MODELS ---

    [Serializable]
    public class RegionData
    {
        public string Name;
        public float PriceMultiplier;
        public float DemandMultiplier;
        public float RentMultiplier;
        public float BuyMultiplier;
    }

    [Serializable]
    public class SegmentData
    {
        public string Name;
        public float BaseADR;
        public float BaseOccupancy;
        public int RoomCount;
        public float RentPerRoom; // Monthly rent per room
        public float BuyPerRoom;  // Purchase price per room
    }

    [Serializable]
    public class RenovationData
    {
        public RenovationLevel Level;
        public int TurnsToComplete;
        public float CostPercent; // Percentage of purchase price
        public float ADRBonus;
        public float DemandBonus;
        public float MaintenanceBonus; // e.g. -0.10 for 10% reduction
    }

    public static class GameData
    {
        public static readonly Dictionary<RegionType, RegionData> Regions = new Dictionary<RegionType, RegionData>
        {
            { RegionType.Taksim, new RegionData { Name = "Taksim", PriceMultiplier = 1.00f, DemandMultiplier = 1.00f, RentMultiplier = 1.00f, BuyMultiplier = 1.00f } },
            { RegionType.Sultanahmet, new RegionData { Name = "Sultanahmet", PriceMultiplier = 0.95f, DemandMultiplier = 1.05f, RentMultiplier = 1.05f, BuyMultiplier = 1.05f } },
            { RegionType.Besiktas, new RegionData { Name = "Beşiktaş", PriceMultiplier = 1.10f, DemandMultiplier = 0.95f, RentMultiplier = 1.15f, BuyMultiplier = 1.15f } }
        };

        public static readonly List<SegmentData> Segments = new List<SegmentData>
        {
            new SegmentData { Name = "Hostel", BaseADR = 1200f, BaseOccupancy = 55f, RoomCount = 20, RentPerRoom = 8000f, BuyPerRoom = 1200000f },
            new SegmentData { Name = "Apart", BaseADR = 1700f, BaseOccupancy = 60f, RoomCount = 15, RentPerRoom = 11000f, BuyPerRoom = 1500000f },
            new SegmentData { Name = "Butik", BaseADR = 2300f, BaseOccupancy = 58f, RoomCount = 12, RentPerRoom = 14000f, BuyPerRoom = 1800000f },
            new SegmentData { Name = "3 Yıldızlı", BaseADR = 2700f, BaseOccupancy = 62f, RoomCount = 40, RentPerRoom = 18000f, BuyPerRoom = 2400000f },
            new SegmentData { Name = "4 Yıldızlı", BaseADR = 3600f, BaseOccupancy = 65f, RoomCount = 60, RentPerRoom = 26000f, BuyPerRoom = 3400000f },
            new SegmentData { Name = "5 Yıldızlı", BaseADR = 8500f, BaseOccupancy = 68f, RoomCount = 100, RentPerRoom = 55000f, BuyPerRoom = 6500000f }
        };

        public static readonly Dictionary<RenovationLevel, RenovationData> Renovations = new Dictionary<RenovationLevel, RenovationData>
        {
            { RenovationLevel.None, new RenovationData { Level = RenovationLevel.None, TurnsToComplete = 0, CostPercent = 0f, ADRBonus = 0f, DemandBonus = 0f, MaintenanceBonus = 0f } },
            { RenovationLevel.Light, new RenovationData { Level = RenovationLevel.Light, TurnsToComplete = 1, CostPercent = 0.03f, ADRBonus = 0.05f, DemandBonus = 0.02f, MaintenanceBonus = 0f } },
            { RenovationLevel.Medium, new RenovationData { Level = RenovationLevel.Medium, TurnsToComplete = 2, CostPercent = 0.07f, ADRBonus = 0.12f, DemandBonus = 0.05f, MaintenanceBonus = 0f } },
            { RenovationLevel.Heavy, new RenovationData { Level = RenovationLevel.Heavy, TurnsToComplete = 4, CostPercent = 0.15f, ADRBonus = 0.25f, DemandBonus = 0.10f, MaintenanceBonus = -0.10f } }
        };

        public static readonly float[] MonthlyMultipliers = { 0.80f, 0.85f, 0.90f, 1.00f, 1.05f, 1.10f, 1.20f, 1.20f, 1.15f, 1.10f, 0.95f, 0.90f };
    }

    // --- CALCULATION LOGIC ---

    public class TurnResult
    {
        public float RealPrice;
        public float Occupancy;
        public float Revenue;
        public float Expense; // Rent or Maintenance
        public int OccupiedRooms;
        public bool IsRenovating;
    }

    public static class EconomyCalculator
    {
        public static TurnResult CalculateTurn(
            RegionType region, 
            int segmentIndex, 
            int month, 
            float priceSlider, 
            OwnershipType ownership, 
            RenovationLevel renoLevel, 
            int turnsLeftOnReno)
        {
            if (turnsLeftOnReno > 0)
            {
                return new TurnResult { IsRenovating = true, Expense = 0 }; // Expenses handled separately or paused
            }

            RegionData regionData = GameData.Regions[region];
            SegmentData segmentData = GameData.Segments[segmentIndex];
            RenovationData renoData = GameData.Renovations[renoLevel];
            float seasonMultiplier = GameData.MonthlyMultipliers[month - 1];

            // 1. Calculate Real Price (Base * Region * Season * Slider * RenoBonus)
            float realPrice = segmentData.BaseADR * regionData.PriceMultiplier * seasonMultiplier * priceSlider * (1.0f + renoData.ADRBonus);

            // 2. Price Deviation Impact
            float priceDeviationPercent = (priceSlider - 1.0f) * 100f;
            float occupancyPriceChange = (priceDeviationPercent > 0) ? -(priceDeviationPercent / 10f) * 6f : -(priceDeviationPercent / 10f) * 4f;

            // 3. Final Occupancy
            float baseDemand = segmentData.BaseOccupancy * regionData.DemandMultiplier * seasonMultiplier;
            float finalOccupancy = baseDemand + (baseDemand * renoData.DemandBonus) + occupancyPriceChange;
            finalOccupancy = Mathf.Clamp(finalOccupancy, 5f, 98f);

            // 4. Revenue
            int occupiedRooms = Mathf.RoundToInt(segmentData.RoomCount * (finalOccupancy / 100f));
            float revenue = occupiedRooms * realPrice;

            // 5. Monthly Expenses
            float expense = 0;
            if (ownership == OwnershipType.Rent)
            {
                // Rent = Rooms * BaseRent * RegionRentMultiplier (Converted to daily for the turn)
                // Assuming 1 turn = 1 unit of time, we'll take monthly/30 for simplicity if 1 turn is 1 day.
                expense = (segmentData.RoomCount * segmentData.RentPerRoom * regionData.RentMultiplier) / 30f;
            }
            else
            {
                // Maintenance (Owned property) - 10% of equivalent rent as a base, adjusted by Reno
                float mockRent = (segmentData.RoomCount * segmentData.RentPerRoom * regionData.RentMultiplier) / 30f;
                expense = (mockRent * 0.15f) * (1.0f + renoData.MaintenanceBonus);
            }

            return new TurnResult
            {
                RealPrice = realPrice,
                Occupancy = finalOccupancy,
                Revenue = revenue,
                Expense = expense,
                OccupiedRooms = occupiedRooms,
                IsRenovating = false
            };
        }

        public static float CalculatePurchasePrice(RegionType region, int segmentIndex)
        {
            RegionData regionData = GameData.Regions[region];
            SegmentData segmentData = GameData.Segments[segmentIndex];
            return segmentData.RoomCount * segmentData.BuyPerRoom * regionData.BuyMultiplier;
        }
    }

    // --- GAME MANAGER ---

    public class HotelManager : MonoBehaviour
    {
        public double Balance = 1000000; // Starting capital
        public int CurrentTurn = 1;
        public int CurrentMonth = 1;

        public RegionType SelectedRegion = RegionType.Taksim;
        public int CurrentSegmentIndex = 0;
        public float PriceSlider = 1.0f;
        
        public OwnershipType OwnershipStatus = OwnershipType.Rent;
        public RenovationLevel CurrentRenovation = RenovationLevel.None;
        public int TurnsUntilRenovationComplete = 0;

        public void EndTurn()
        {
            TurnResult result = EconomyCalculator.CalculateTurn(
                SelectedRegion, 
                CurrentSegmentIndex, 
                CurrentMonth, 
                PriceSlider, 
                OwnershipStatus, 
                CurrentRenovation, 
                TurnsUntilRenovationComplete);

            if (result.IsRenovating)
            {
                TurnsUntilRenovationComplete--;
                Debug.Log($"Hotel is under renovation. {TurnsUntilRenovationComplete} turns left.");
            }
            else
            {
                Balance += (result.Revenue - result.Expense);
                Debug.Log($"Turn {CurrentTurn} Result - Revenue: {result.Revenue:N0}, Expense: {result.Expense:N0}, Net: {(result.Revenue - result.Expense):N0}");
            }

            CurrentTurn++;
            if (CurrentTurn % 30 == 0) CurrentMonth = (CurrentMonth % 12) + 1; // 30 turns = 1 month
        }

        public void BuyHotel()
        {
            float price = EconomyCalculator.CalculatePurchasePrice(SelectedRegion, CurrentSegmentIndex);
            if (Balance >= price && OwnershipStatus == OwnershipType.Rent)
            {
                Balance -= price;
                OwnershipStatus = OwnershipType.Own;
                Debug.Log("Purchased Hotel Asset!");
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
                Debug.Log($"Started {level} Renovation. Cost: {cost:N0}");
            }
        }
    }
}
