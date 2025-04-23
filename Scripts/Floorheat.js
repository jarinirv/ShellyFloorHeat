// User-configurable settings
let Region = "FI"; // Supported regions: DK1, DK2, EE, FI, LT, LV, NO1, NO2, NO3, NO4, NO5, SE1, SE2, SE3, SE4
let Relays = [0];  // Relays to control. For example: [0,1,2]
let CheapestHours = "0";  // How many cheapest hours relay will be turned on?
                           // To ONLY use a price limit, set CheapestHours to "0".
let OnlyNightHours = false;  // If true, cheapest hours are only searched from the night hours (22:00 - 07:00), false = all hours
let PriceAlwaysAllowed = "6"; // Below what price (in euro cents) the relay can be always on. Use "-999" to disable.
let MaxAllowedPrice = 20; // **NEW** - If electricity price exceeds this, heating is OFF.
let BackupHours = [2, 3, 4, 5, 6]; // If Internet connection is down, turn relay ON during these hours (0...23). 
let Inverted = false; // If true, relay logic is inverted.
let MaxTemperature = 29.5;    // Maximum temperature limit (°C)
// if using to heat bathroom floor I'd suggest adjusting MaxTemperature based on your water insulation manufacturers info  
let MinTemperature = 23;    // Minimum temperature limit to reheat (°C)
let DesiredTemperature = 26; // Desired temperature (°C)

// User-configurable Timer settings (milliseconds)
let InitialFetchDelay  = 60000;    // First fetch after 1 minute
let TempTimerInterval = 300000;    // Fetch temperature every 5 minutes
let PriceTimerInterval = 900000;   // Fetch price every 15 minutes

// Debug mode & API counter
let DebugMode = true;
let apiCallCount = 0;

// Internal variables holding latest readings
let previousAction = "";
let lastPriceResult = null;
let lastTemperature = null;

// Set up relay inversion strings
let invertedOn = "true";
let invertedOff = "false";
if (Inverted === true) {
  invertedOn = "false";
  invertedOff = "true";
}

// Determine the URL for electricity price API
let urlToCall = "";
if (!OnlyNightHours) {
  urlToCall = "https://api.spot-hinta.fi/JustNowRank/" + CheapestHours + "/" + PriceAlwaysAllowed + "?region=" + Region;
  print("Using electricity price URL: " + urlToCall);
} else {
  urlToCall = "https://api.spot-hinta.fi/JustNowRankNight?rank=" + CheapestHours + "&priceAlwaysAllowed=" + PriceAlwaysAllowed + "&region=" + Region;
  print("Using electricity price URL (Night): " + urlToCall);
}

print("Script started. Initial fetch will occur in " + (InitialFetchDelay / 60000) + " minutes.");

//-------------------------------------------------------------------
// Function: updateRelays()
// Executes relay switching based on electricity price first, then temperature.
function updateRelays() {
  if (lastTemperature === null) {
    print("No temperature reading available yet; relay actions skipped.");
    return;
  }
  
  let currentHour = new Date().getHours();
  
  // If price API failed, apply backup logic
  if (!lastPriceResult || lastPriceResult.error) {
    print("Price API unavailable. Using backup hours strategy.");
    if (BackupHours.indexOf(currentHour) !== -1) {
      for (let i = 0; i < Relays.length; i++) {
        Shelly.call("Switch.Set", "{ id:" + Relays[i] + ", on:" + invertedOn + "}", null, null);
        print("Backup: Relay " + Relays[i] + " turned ON (Inverted: " + Inverted + ").");
      }
    } else {
      for (let i = 0; i < Relays.length; i++) {
        Shelly.call("Switch.Set", "{ id:" + Relays[i] + ", on:" + invertedOff + "}", null, null);
        print("Backup: Relay " + Relays[i] + " turned OFF (Inverted: " + Inverted + ").");
      }
    }
    return;
  }
  
  let priceCode = lastPriceResult.code;
  let priceCents = lastPriceResult.price; // Assuming API provides price in cents

  // 🔴 **NEW RULE: If price is too expensive (> MaxAllowedPrice), force heating OFF**
  if (priceCents > MaxAllowedPrice) {
    print("Electricity price too high (" + priceCents + " cents). Heating disabled.");
    for (let i = 0; i < Relays.length; i++) {
      Shelly.call("Switch.Set", "{ id:" + Relays[i] + ", on:" + invertedOff + "}", null, null);
    }
    return;
  }

  // ✅ **Price is within range; use normal temperature-based control**
  if (lastTemperature < DesiredTemperature) {
    for (let i = 0; i < Relays.length; i++) {
      Shelly.call("Switch.Set", "{ id:" + Relays[i] + ", on:" + invertedOn + "}", null, null);
      print("Temperature low (" + lastTemperature + "°C). Relay " + Relays[i] + " turned ON.");
    }
  } else if (lastTemperature >= MinTemperature && lastTemperature < MaxTemperature) {
    if ((priceCode === 400 || priceCode === 200) && previousAction === priceCode) {
      print("No relay action needed. Price unchanged (" + priceCode + "), Temp: " + lastTemperature + "°C.");
      return;
    }
    for (let i = 0; i < Relays.length; i++) {
      if (priceCode === 400) {
        Shelly.call("Switch.Set", "{ id:" + Relays[i] + ", on:" + invertedOff + "}", null, null);
        print("Expensive electricity detected (Price code 400). Relay " + Relays[i] + " turned OFF.");
      }
      if (priceCode === 200) {
        Shelly.call("Switch.Set", "{ id:" + Relays[i] + ", on:" + invertedOn + "}", null, null);
        print("Cheap electricity detected (Price code 200). Relay " + Relays[i] + " turned ON.");
      }
    }
    previousAction = priceCode;
  } else if (lastTemperature < MinTemperature) {
    for (let i = 0; i < Relays.length; i++) {
      if (priceCode === 200) {
        Shelly.call("Switch.Set", "{ id:" + Relays[i] + ", on:" + invertedOn + "}", null, null);
        print("Critical low temperature (" + lastTemperature + "°C). Relay ON.");
      }
    }
  } else {
    for (let i = 0; i < Relays.length; i++) {
      Shelly.call("Switch.Set", "{ id:" + Relays[i] + ", on:" + invertedOff + "}", null, null);
      print("High temperature (" + lastTemperature + "°C). Relay OFF.");
    }
    previousAction = "";
  }
}

//-------------------------------------------------------------------
// Function: fetchPrice()
function fetchPrice() {
  Shelly.call("HTTP.GET", { url: urlToCall, timeout: 15, ssl_ca: "*" }, function(result, error_code) {
    apiCallCount++;
    if (DebugMode) {
      print("API calls made: " + apiCallCount);
      if (apiCallCount > 1400) print("Warning: Near 1440 daily API limit!");
    }
    if (error_code === 0 && result !== null) {
      lastPriceResult = result;
    } else {
      lastPriceResult = { error: true };
    }
    updateRelays();
  });
}

//-------------------------------------------------------------------
// Function: fetchTemperature()
function fetchTemperature() {
  try {
    lastTemperature = Shelly.getComponentStatus('Temperature', 100).tC;
  } catch (e) {
    lastTemperature = MaxTemperature + 1;
  }
  updateRelays();
}

// Initial fetch
Timer.set(InitialFetchDelay, false, function() {
  fetchPrice();
  fetchTemperature();
});

// Recurring timers
Timer.set(PriceTimerInterval, true, fetchPrice);
Timer.set(TempTimerInterval, true, fetchTemperature);