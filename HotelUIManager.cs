using UnityEngine;
using TMPro;
using UnityEngine.UI;

namespace HotelTycoon.Core
{
    public class HotelUIManager : MonoBehaviour
    {
        [Header("Managers")]
        public HotelManager hotelManager;

        [Header("Main Dashboard UI")]
        public TextMeshProUGUI balanceText;
        public TextMeshProUGUI dateText;
        public TextMeshProUGUI hotelNameText;
        public TextMeshProUGUI segmentText;
        public Image hotelIllustration; // Placeholder for changing hotel sprite
        
        [Header("Controls")]
        public Slider priceSlider;
        public TextMeshProUGUI priceValueText;
        public Button endTurnButton;
        public Button rentBuyButton; // To toggle "Pay Rent" vs "Buy" logic logic visually if needed
        
        [Header("Popups")]
        public GameObject reportPanel;
        public TextMeshProUGUI reportDetailsText;
        public Button closeReportButton;

        private void Start()
        {
            // Initialize UI
            if (hotelManager == null) hotelManager = FindObjectOfType<HotelManager>();
            
            // Setup Listeners
            priceSlider.onValueChanged.AddListener(OnPriceSliderChanged);
            endTurnButton.onClick.AddListener(OnEndTurnClicked);
            closeReportButton.onClick.AddListener(CloseReportPanel);

            // Initial Update
            UpdateDashboard();
            reportPanel.SetActive(false);
        }

        private void OnPriceSliderChanged(float value)
        {
            // Update logic
            hotelManager.PriceSlider = value;
            
            // Calculate hypothetical price for display
            // We need to access the current segment base price to show the "Real" price
            // For MVP, we'll just show the percentage or a rough estimate
            // In a full implementation, we'd ask Manager for the "Projected Price"
            
            priceValueText.text = $"Fiyat Çarpanı: %{value * 100:F0}";
            // Better: Show actual monetary value if possible (requires accessing GameData)
        }

        private void OnEndTurnClicked()
        {
            hotelManager.EndTurn();
            ShowReport();
            UpdateDashboard();
        }

        private void UpdateDashboard()
        {
            balanceText.text = $"{hotelManager.Balance:N0} ₺";
            dateText.text = $"Ay: {hotelManager.CurrentMonth} | Gün: {hotelManager.CurrentTurn}";
            // Determine Segment Name based on index
            var segmentName = GameData.Segments[hotelManager.CurrentSegmentIndex].Name;
            segmentText.text = segmentName;
            
            // Re-sync slider in case logic changed it
            priceSlider.value = hotelManager.PriceSlider;
        }

        private void ShowReport()
        {
            // In a real app, HotelManager.EndTurn() would return the result.
            // We might need to modify HotelManager to store "LastTurnResult" or return it.
            // For now, let's assume we read the log or state from Manager.
            
            // Note: I will update HotelManager to store 'LastTurnResult' so we can read it here.
            if (hotelManager.LastTurnResult != null)
            {
                var r = hotelManager.LastTurnResult;
                reportDetailsText.text = 
                    $"<b>GÜN SONU RAPORU</b>\n\n" +
                    $"Doluluk: %{r.Occupancy:F1}\n" +
                    $"Gelir: {r.Revenue:N0} ₺\n" +
                    $"Gider: {r.Expense:N0} ₺\n" +
                    $"----------------\n" +
                    $"<b>NET: {(r.Revenue - r.Expense):N0} ₺</b>";
                
                reportPanel.SetActive(true);
            }
        }

        private void CloseReportPanel()
        {
            reportPanel.SetActive(false);
        }
    }
}
