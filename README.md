# API.SPOT-HINTA.FI / For Shelly Plus smart relays
Spot-hinta.fi Shelly Plus scripts automate relays according to the electricity spot-prices, which are read from the api.spot-hinta.fi. Scripts works in Finland, Sweden, Norway, Denmark, Estonia, Latvia and Lithuania. See API Swagger documentation for details: https://api.spot-hinta.fi/swagger/ui

This script may suit for you if you're using Shelly for electric floor heating and have, besides on main unit like  1PM,  Plus Add-on piggybag with temperature sensor DS18B20

## Installation instructions

1. Open web browser and go to Shelly Web Admin aka device's web user interface.
2. Copy the script
3. Run script
   
Enjoy automatic control of your relays when the electricity price is cheap (or maybe not cheap, but at least not the most expensive)
If you go directly to main unit ip-address via browser and scripts you can see something like this:
Cheap electricity detected (Price code 200). Relay 0 turned ON.
20:38:01
No relay action needed. Price unchanged (200), Temp: 29.3°C.
20:43:01
API calls made: 27
20:43:02
No relay action needed. Price unchanged (200), Temp: 29.3°C.
20:43:02
No relay action needed. Price unchanged (200), Temp: 29.2°C.
20:48:01
No relay action needed. Price unchanged (200), Temp: 29.2°C.
20:53:01
No relay action needed. Price unchanged (200), Temp: 29.3°C.

