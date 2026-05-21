// Wait for the HTML to fully load before running the script
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Grab the HTML elements we need to interact with
    const truckLoaderTab = document.getElementById('truckLoaderTab');
    const karigaarTab = document.getElementById('karigaarTab');
    
    const truckLoaderPage = document.getElementById('truckLoaderPage');
    const karigaarPage = document.getElementById('karigaarPage');

    // 2. Function to show the Truck Loader page
    truckLoaderTab.addEventListener('click', () => {
        // Hide Karigaar, Show Truck
        karigaarPage.classList.add('hidden');
        truckLoaderPage.classList.remove('hidden');
        
        // Update Tab Colors
        truckLoaderTab.classList.add('tab-active');
        karigaarTab.classList.remove('tab-active');
        
        // Reset text colors so the active one stands out
        truckLoaderTab.classList.remove('text-gray-500');
        karigaarTab.classList.add('text-gray-500');
    });

    // 3. Function to show the Karigaar page
    karigaarTab.addEventListener('click', () => {
        // Hide Truck, Show Karigaar
        truckLoaderPage.classList.add('hidden');
        karigaarPage.classList.remove('hidden');
        
        // Update Tab Colors
        karigaarTab.classList.add('tab-active');
        truckLoaderTab.classList.remove('tab-active');
        
        // Reset text colors
        karigaarTab.classList.remove('text-gray-500');
        truckLoaderTab.classList.add('text-gray-500');
    });
});