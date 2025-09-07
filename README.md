# API.SPOT-HINTA.FI / For Shelly Plus smart relays
Well, not directly, this is a fork to suit my needs :-)
Spot-hinta.fi Shelly Plus scripts automate relays according to the electricity spot-prices, which are read from the api.spot-hinta.fi. Scripts works in Finland, Sweden, Norway, Denmark, Estonia, Latvia and Lithuania. See API Swagger documentation for details: https://api.spot-hinta.fi/swagger/ui

Study scripts and read comments to select which script suits the best for your needs.

## Installation instructions

1. Open web browser and go to Shelly Web Admin aka device's web user interface.
2. Update Shelly firmware to the latest version: Settings > Firmware > Update.
3. Copy the script to your Shelly-device 
5. Adjust script settings according to your needs. Scripts have comments in English.
6. Test the script: Change the settings and verify that the relay is does the expected thing. This should be done by logging to Shelly directly to ip, not via cloud as Console shows what it is doing.




## Shelly scripts in this package

### Floorheat.js
Combines Shelly 1PM along Plus Add-On with temperature sensor


