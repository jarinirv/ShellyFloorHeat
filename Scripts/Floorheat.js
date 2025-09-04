// This works with Shelly 1PM Gen3, Shelly Plus Add-On and compatible temperature-sensor cable attached to Add-On
// My use-case is electric floor heating of tiled bathroom floor
// User-configurable settings
let Region = "FI"; // Supported regions: DK1, DK2, EE, FI, LT, LV, NO1, NO2, NO3, NO4, NO5, SE1, SE2, SE3, SE4
let Relays = [0];  // Relays to control. For example: [0,1,2]
let CheapestHours = "0";  // How many cheapest hours relay will be turned on?
                           // To ONLY use a price limit, set CheapestHours to "0".
let OnlyNightHours = false;  // If true, cheapest hours are only searched from the night hours (22:00 - 07:00), false = all hours
let PriceAlwaysAllowed = "8"; // Below what price (in euro cents) the relay can be always on. Use "-999" to disable.
let MaxAllowedPrice = 8; // **NEW** - If electricity price exceeds this, heating is OFF.
let BackupHours = [2, 3, 4, 5, 6]; // If Internet connection is down, turn relay ON during these hours (0...23). 
let Inverted = false; // If true, relay logic is inverted.
let LowTemperature = 23;    // Minimum temperature limit to reheat (°C)
let MidTemperature = 26; // Desired temperature (°C)
let MaxTemperature = 30;    // Maximum temperature limit measured(°C)
// if using to heat bathroom floor I'd suggest adjusting MaxTemperature based on your water insulation manufacturers info
// this is, however, a precaution as for eg. Kiilto and Ardex can do up to 70°C
// then again, maybe keep it at low 30´s  to avoid complaints from family
// it happened to me that when tampering the relay, it got up to over 40°C, after that I also used actions of my Shelly Add-on



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
let hasFreshPrice = false;
let hasFreshTemperature = false;

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
// Now waits for both temp and price to be fetched.
function updateRelays() {
  if (!hasFreshPrice || !hasFreshTemperature) {
    return; // Wait until both are available
  }

  let currentHour = new Date().getHours();

  // If price API failed, apply backup logic
  if (!lastPriceResult || lastPriceResult.error) {
    print("Price API unavailable. Using backup hours strategy.");
    for (let i = 0; i < Relays.length; i++) {
      let state = BackupHours.indexOf(currentHour) !== -1 ? invertedOn : invertedOff;
      Shelly.call("Switch.Set", "{ id:" + Relays[i] + ", on:" + state + "}", null, null);
      print("Backup: Relay " + Relays[i] + " turned " + (state === invertedOn ? "ON" : "OFF") + " (Inverted: " + Inverted + ").");
    }
    return;
  }

  let priceCode = lastPriceResult.code;

  // 🔍 NEW fallback if priceCode is invalid
  if (priceCode !== 200 && priceCode !== 400) {
    print("Unexpected price code (" + priceCode + "). Using backup strategy.");
    lastPriceResult.error = true;
    updateRelays();
    return;
  }

  // 🔴 NEW logic: heating is always OFF if priceCode suggests expensive electricity
  if (priceCode === 400) {
    print("Electricity code indicates expensive rate. Heating OFF.");
    for (let i = 0; i < Relays.length; i++) {
      Shelly.call("Switch.Set", "{ id:" + Relays[i] + ", on:" + invertedOff + "}", null, null);
    }
    return;
  }

  // ✅ Normal relay control based on temperature
  if (lastTemperature < LowTemperature) {
    for (let i = 0; i < Relays.length; i++) {
      Shelly.call("Switch.Set", "{ id:" + Relays[i] + ", on:" + invertedOn + "}", null, null);
      print("Temperature low (" + lastTemperature + "°C). Relay " + Relays[i] + " turned ON.");
    }
  } else if (lastTemperature >= LowTemperature && lastTemperature < MaxTemperature) {
    if (priceCode === previousAction) {
      print("No relay action needed. Price unchanged (" + priceCode + "), Temp: " + lastTemperature + "°C.");
      return;
    }
    for (let i = 0; i < Relays.length; i++) {
      if (priceCode === 200) {
        Shelly.call("Switch.Set", "{ id:" + Relays[i] + ", on:" + invertedOn + "}", null, null);
        print("Cheap electricity detected (Code 200). Relay " + Relays[i] + " turned ON.");
      }
    }
    previousAction = priceCode;
  } else {
    // Temp too high — shut off relays
    for (let i = 0; i < Relays.length; i++) {
      Shelly.call("Switch.Set", "{ id:" + Relays[i] + ", on:" + invertedOff + "}", null, null);
      print("High temperature (" + lastTemperature + "°C). Relay OFF.");
    }
    previousAction = "";
  }

  // Reset freshness flags so next cycle waits for fresh data again
  hasFreshPrice = false;
  hasFreshTemperature = false;
}

//-------------------------------------------------------------------
// Function: fetchPrice()
// Fetches from spot-hinta.fi and reads price CODE (not actual cents value)
function fetchPrice() {
  Shelly.call("HTTP.GET", { url: urlToCall, timeout: 15, ssl_ca: "*" }, function(result, error_code) {
    apiCallCount++;
    if (DebugMode) {
      print("API calls made: " + apiCallCount);
      if (apiCallCount > 1400) print("Warning: Near 1440 daily API limit!");
    }

    if (error_code === 0 && result && result.code !== undefined) {
      lastPriceResult = result;
      hasFreshPrice = true;
      print("Fetched price code: " + result.code);
    } else {
      lastPriceResult = { error: true };
      hasFreshPrice = true;
      print("Error fetching price!");
    }

    updateRelays(); // Run logic only after fetch completes
  });
}

//-------------------------------------------------------------------
// Function: fetchTemperature()
// Reads from internal sensor
function fetchTemperature() {
  try {
    lastTemperature = Shelly.getComponentStatus('Temperature', 100).tC;
    print("Current temperature: " + lastTemperature + "°C");
  } catch (e) {
    lastTemperature = MaxTemperature + 1;
    print("Temperature sensor read failed! Forcing heating OFF.");
  }

  hasFreshTemperature = true;
  updateRelays(); // Run logic only after fetch completes
}

// Initial fetch
Timer.set(InitialFetchDelay, false, function() {
  fetchTemperature(); // Grab temp
  fetchPrice();       // Grab price
});

// Recurring timers
Timer.set(PriceTimerInterval, true, fetchPrice);
Timer.set(TempTimerInterval, true, fetchTemperature);
